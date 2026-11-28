import { fetchOgMediaMetadata, getTmdbKey } from "../../_shared/tmdb";

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
const OG_CACHE_URL_PREFIX = "https://og-meta.101movies.internal/v4";
const CRAWLER_UA_RE =
  /(bot|crawl|spider|slurp|facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|discordbot|slackbot|linkedinbot|applebot|imessage|embedly|quora|pinterest|vkshare|w3c_validator|bingpreview|line|kakaotalk|wechat|micromessenger|qq\/)/i;

function truncateOverview(text: string, maxLen = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

function buildOgMetadata(
  details: any,
  type: "movie" | "tv",
  id: string,
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

  const displayTitle = year ? `${title} (${year})` : title;
  const imageUrl =
    details.backdrop_path || details.poster_path
      ? `${origin}/api/og/${type}/${id}?v=3`
      : `${origin}/og-image.png?v=5`;

  return {
    title: displayTitle,
    description,
    imageUrl,
    imageWidth: "1200",
    imageHeight: "630",
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

async function readCachedOgMetadata(
  type: "movie" | "tv",
  id: string
): Promise<OgMetadata | null> {
  const cache = typeof caches !== "undefined" ? (caches as any).default : null;
  if (!cache) return null;
  const cacheReq = new Request(`${OG_CACHE_URL_PREFIX}/${type}/${id}`, {
    method: "GET",
  });
  try {
    const cachedRes = await cache.match(cacheReq);
    if (cachedRes) {
      const cachedData = (await cachedRes.json()) as OgMetadata;
      if (cachedData?.title) return cachedData;
    }
  } catch {
    // Ignore cache read failures
  }
  return null;
}

async function fetchAndCacheOgMetadata(
  type: "movie" | "tv",
  id: string,
  origin: string,
  apiKey: string
): Promise<OgMetadata | null> {
  if (!apiKey) return null;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const details = await Promise.race([
      fetchOgMediaMetadata(type, id, apiKey, false),
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), DEFAULT_OG_TIMEOUT_MS);
      }),
    ]);

    const og = buildOgMetadata(details, type, id, origin);
    const cache = typeof caches !== "undefined" ? (caches as any).default : null;
    if (og && cache) {
      const cacheReq = new Request(`${OG_CACHE_URL_PREFIX}/${type}/${id}`, {
        method: "GET",
      });
      const toCache = new Response(JSON.stringify(og), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": `public, max-age=${OG_CACHE_TTL_SECONDS}`,
        },
      });
      try {
        await cache.put(cacheReq, toCache);
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
  const ua = context.request.headers.get("user-agent") || "";
  const isCrawler = CRAWLER_UA_RE.test(ua);
  if (!isCrawler) {
    return fetchBaseSpaHtml(context, reqUrl.origin);
  }

  const apiKey = getTmdbKey(context.env);

  const [baseRes, cachedOg] = await Promise.all([
    fetchBaseSpaHtml(context, reqUrl.origin),
    readCachedOgMetadata(mediaType, id),
  ]);

  let og = cachedOg;
  if (!og && apiKey) {
    og = await fetchAndCacheOgMetadata(mediaType, id, reqUrl.origin, apiKey);
  }

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
