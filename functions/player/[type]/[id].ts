import { fetchMediaDetails, getTmdbKey } from "../../_shared/tmdb";

interface OgMetadata {
  title: string;
  description: string;
  imageUrl: string;
  imageWidth: string;
  imageHeight: string;
  ogType: "video.movie" | "video.tv_show";
}

const DEFAULT_OG_TIMEOUT_MS = 2500;
const OG_CACHE_TTL_SECONDS = 3600;

function truncateOverview(text: string, maxLen = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

function buildOgMetadata(
  details: any,
  type: "movie" | "tv",
  origin: string
): OgMetadata | null {
  if (!details || details.success === false) return null;

  const title = String(details.title || details.name || "").trim();
  if (!title) return null;

  const releaseDate = String(
    details.release_date || details.first_air_date || ""
  ).trim();
  const year = releaseDate.length >= 4 ? releaseDate.slice(0, 4) : "";
  const rating = Number(details.vote_average || 0);
  const overview = truncateOverview(String(details.overview || ""));

  const metaParts = [
    type === "tv" ? "TV Series" : "Movie",
    year,
    rating > 0 ? `★ ${rating.toFixed(1)}` : "",
  ].filter(Boolean);

  const description = overview
    ? `${metaParts.join(" · ")} — ${overview}`
    : `Watch ${title} (${metaParts.join(" · ")}) on 101Movies.`;

  let imageUrl = `${origin}/og-image.png`;
  let imageWidth = "1200";
  let imageHeight = "630";

  if (details.backdrop_path) {
    imageUrl = `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`;
    imageWidth = "1280";
    imageHeight = "720";
  } else if (details.poster_path) {
    imageUrl = `https://image.tmdb.org/t/p/w780${details.poster_path}`;
    imageWidth = "780";
    imageHeight = "1170";
  }

  return {
    title,
    description,
    imageUrl,
    imageWidth,
    imageHeight,
    ogType: type === "tv" ? "video.tv_show" : "video.movie",
  };
}

async function fetchBaseSpaHtml(context: EventContext<any, any, any>, origin: string): Promise<Response> {
  const assets = context.env?.ASSETS as { fetch?: typeof fetch } | undefined;
  if (assets && typeof assets.fetch === "function") {
    try {
      // Request root "/" directly (avoids Pretty-URLs 308 on /index.html and conditional 304)
      const assetRes = await assets.fetch(new URL("/", origin).toString());
      const contentType = assetRes.headers.get("content-type") || "";
      if (assetRes.ok && contentType.includes("text/html")) {
        return assetRes;
      }
    } catch {
      // Fall back to context.next() below
    }
  }
  return context.next();
}

async function getCachedOrFreshOgMetadata(
  type: "movie" | "tv",
  id: string,
  origin: string,
  context: EventContext<any, any, any>
): Promise<OgMetadata | null> {
  const apiKey = getTmdbKey(context.env);
  if (!apiKey) return null;

  const cache = typeof caches !== "undefined" ? (caches as any).default : null;
  const cacheUrl = `https://og-meta.101movies.internal/v1/${type}/${id}`;
  const cacheReq = new Request(cacheUrl, { method: "GET" });

  if (cache) {
    try {
      const cachedRes = await cache.match(cacheReq);
      if (cachedRes) {
        const cachedData = (await cachedRes.json()) as OgMetadata;
        if (cachedData?.title) return cachedData;
      }
    } catch {
      // Ignore cache read failures
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const details = await Promise.race([
      fetchMediaDetails(type, id, apiKey),
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), DEFAULT_OG_TIMEOUT_MS);
      }),
    ]);

    const og = buildOgMetadata(details, type, origin);
    if (og && cache && context.waitUntil) {
      const toCache = new Response(JSON.stringify(og), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": `public, max-age=${OG_CACHE_TTL_SECONDS}`,
        },
      });
      try {
        context.waitUntil(cache.put(cacheReq, toCache));
      } catch {
        // Ignore cache write failures
      }
    }
    return og;
  } catch {
    return null;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export const onRequestGet: PagesFunction = async (context) => {
  const rawType = String(context.params.type || "").toLowerCase();
  const id = String(context.params.id || "").trim();
  const reqUrl = new URL(context.request.url);

  if ((rawType !== "movie" && rawType !== "tv") || !/^\d+$/.test(id)) {
    return fetchBaseSpaHtml(context, reqUrl.origin);
  }

  const mediaType = rawType as "movie" | "tv";
  const [baseRes, og] = await Promise.all([
    fetchBaseSpaHtml(context, reqUrl.origin),
    getCachedOrFreshOgMetadata(mediaType, id, reqUrl.origin, context),
  ]);

  const contentType = baseRes.headers.get("content-type") || "";
  if (!og || !baseRes.ok || !contentType.includes("text/html")) {
    return baseRes;
  }

  const canonicalUrl = `${reqUrl.origin}/player/${mediaType}/${id}`;
  const docTitle = `${og.title} · 101Movies`;

  const headers = new Headers(baseRes.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");

  const cleanRes = new Response(baseRes.body, {
    status: baseRes.status,
    statusText: baseRes.statusText,
    headers,
  });

  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(docTitle);
      },
    })
    .on('meta[name="title"]', {
      element(el) {
        el.setAttribute("content", og.title);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute("content", og.description);
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute("href", canonicalUrl);
      },
    })
    .on('meta[property="og:type"]', {
      element(el) {
        el.setAttribute("content", og.ogType);
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        el.setAttribute("content", canonicalUrl);
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute("content", og.title);
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        el.setAttribute("content", og.description);
      },
    })
    .on('meta[property="og:image"]', {
      element(el) {
        el.setAttribute("content", og.imageUrl);
      },
    })
    .on('meta[property="og:image:width"]', {
      element(el) {
        el.setAttribute("content", og.imageWidth);
      },
    })
    .on('meta[property="og:image:height"]', {
      element(el) {
        el.setAttribute("content", og.imageHeight);
      },
    })
    .on('meta[property="og:image:alt"]', {
      element(el) {
        el.setAttribute("content", og.title);
      },
    })
    .on('meta[name="twitter:url"]', {
      element(el) {
        el.setAttribute("content", canonicalUrl);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(el) {
        el.setAttribute("content", og.title);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(el) {
        el.setAttribute("content", og.description);
      },
    })
    .on('meta[name="twitter:image"]', {
      element(el) {
        el.setAttribute("content", og.imageUrl);
      },
    })
    .transform(cleanRes);
};
