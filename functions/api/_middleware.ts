export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const isVodProxy = url.pathname.includes("/vod/proxy");

  if (context.request.method === "OPTIONS") {
    const optHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": isVodProxy ? url.origin : "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
      "Access-Control-Max-Age": "86400",
    };
    if (isVodProxy) {
      optHeaders["Vary"] = "Origin";
    }
    return new Response(null, {
      status: 204,
      headers: optHeaders,
    });
  }

  const isGet = context.request.method === "GET";

  const isCacheableApiGet =
    isGet &&
    !isVodProxy &&
    !url.pathname.includes("/sync/");

  // Cloudflare native edge cache
  const cache = typeof caches !== "undefined" ? (caches as any).default : null;
  const cacheKey = isCacheableApiGet
    ? new Request(context.request.url, { method: "GET" })
    : null;

  if (cache && cacheKey) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const h = new Headers(cached.headers);
        h.set("X-Cache-Status", "HIT");
        h.set("Access-Control-Allow-Origin", "*");
        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers: h,
        });
      }
    } catch {}
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  if (!isVodProxy) {
    headers.set("Access-Control-Allow-Origin", "*");
  }

  // Apply Edge Caching headers if successful GET response
  if (isCacheableApiGet && response.status === 200) {
    headers.set("X-Cache-Status", "MISS");
    if (url.pathname.includes("/tmdb/")) {
      headers.set(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=86400"
      );
    } else if (url.pathname.includes("/vod/resolve")) {
      headers.set(
        "Cache-Control",
        "public, max-age=1800, s-maxage=3600, stale-while-revalidate=43200"
      );
    }

    const responseToCache = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    if (cache && cacheKey && context.waitUntil) {
      try {
        context.waitUntil(cache.put(cacheKey, responseToCache.clone()));
      } catch {}
    }

    return responseToCache;
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
