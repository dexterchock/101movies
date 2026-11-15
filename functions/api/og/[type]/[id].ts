import { Resvg } from "@cf-wasm/resvg/workerd";
import { buildMovieOgSvg, extractOgCardInput } from "../../../_shared/ogCard";
import { fetchMediaDetails, getTmdbKey } from "../../../_shared/tmdb";

const OG_IMAGE_CACHE_TTL = 86400 * 7;

let fontBuffersPromise: Promise<Uint8Array[]> | null = null;

async function loadWorkerFonts(
  context: EventContext<any, any, any>,
  origin: string
): Promise<Uint8Array[]> {
  if (fontBuffersPromise) return fontBuffersPromise;

  fontBuffersPromise = (async () => {
    const assets = context.env?.ASSETS as { fetch?: typeof fetch } | undefined;
    const fetchAsset = (path: string) => {
      const url = new URL(path, origin).toString();
      return assets && typeof assets.fetch === "function" ? assets.fetch(url) : fetch(url);
    };

    const [boldRes, regularRes] = await Promise.all([
      fetchAsset("/fonts/Poppins-Bold.ttf"),
      fetchAsset("/fonts/Poppins-Regular.ttf"),
    ]);
    if (!boldRes.ok || !regularRes.ok) {
      throw new Error("Failed to load bundled OG fonts from ASSETS");
    }

    const [boldBuf, regularBuf] = await Promise.all([
      boldRes.arrayBuffer(),
      regularRes.arrayBuffer(),
    ]);
    return [new Uint8Array(boldBuf), new Uint8Array(regularBuf)];
  })().catch((err) => {
    fontBuffersPromise = null;
    throw err;
  });

  return fontBuffersPromise;
}

export const onRequestGet: PagesFunction = async (context) => {
  const rawType = String(context.params.type || "").toLowerCase();
  const id = String(context.params.id || "").trim();
  const reqUrl = new URL(context.request.url);
  const fallbackUrl = `${reqUrl.origin}/og-image.png?v=5`;

  if ((rawType !== "movie" && rawType !== "tv") || !/^\d+$/.test(id)) {
    return Response.redirect(fallbackUrl, 302);
  }

  const cache = typeof caches !== "undefined" ? (caches as any).default : null;
  const cacheKey = new Request(`https://og-img.101movies.internal/v3/${rawType}/${id}`, {
    method: "GET",
  });

  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    } catch {
      // Ignore cache lookup failures
    }
  }

  const mediaType = rawType as "movie" | "tv";
  const apiKey = getTmdbKey(context.env);
  if (!apiKey) {
    return Response.redirect(fallbackUrl, 302);
  }

  let details: any = null;
  try {
    details = await fetchMediaDetails(mediaType, id, apiKey);
    const input = extractOgCardInput(details, mediaType);
    if (!input) {
      return Response.redirect(fallbackUrl, 302);
    }

    const [svg, fontBuffers] = await Promise.all([
      buildMovieOgSvg(input),
      loadWorkerFonts(context, reqUrl.origin),
    ]);

    const resvg = await Resvg.async(svg, {
      fitTo: { mode: "width", value: 1200 },
      font: {
        fontBuffers,
        loadSystemFonts: false,
        defaultFontFamily: "Poppins",
      },
    });
    const pngBytes = resvg.render().asPng();

    const response = new Response(pngBytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": `public, max-age=86400, s-maxage=${OG_IMAGE_CACHE_TTL}, stale-while-revalidate=86400`,
      },
    });

    if (cache && context.waitUntil) {
      try {
        context.waitUntil(cache.put(cacheKey, response.clone()));
      } catch {
        // Ignore cache write failures
      }
    }

    return response;
  } catch (err) {
    console.error("Failed to generate movie OG image:", err);
    if (details?.backdrop_path) {
      return Response.redirect(`https://image.tmdb.org/t/p/w1280${details.backdrop_path}`, 302);
    }
    if (details?.poster_path) {
      return Response.redirect(`https://image.tmdb.org/t/p/w780${details.poster_path}`, 302);
    }
    return Response.redirect(fallbackUrl, 302);
  }
};
