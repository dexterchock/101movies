export const onRequest: PagesFunction = async (context) => {
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const isGet = context.request.method === "GET";
  const url = new URL(context.request.url);

  // Cloudflare native edge cache
  const cache = typeof caches !== "undefined" ? (caches as any).default : null;
  const cacheKey =
    isGet && !url.pathname.includes("/vod/proxy")
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
  headers.set("Access-Control-Allow-Origin", "*");

  // Apply Edge Caching headers if successful GET response
  if (isGet && response.status === 200 && !url.pathname.includes("/vod/proxy")) {
    headers.set("X-Cache-Status", "MISS");
    if (
      url.pathname.includes("/tmdb/trending") ||
      url.pathname.includes("/tmdb/discover")
    ) {
      headers.set(
        "Cache-Control",
        "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400"
      );
    } else if (url.pathname.includes("/tmdb/search")) {
      headers.set(
        "Cache-Control",
        "public, max-age=900, s-maxage=1800, stale-while-revalidate=43200"
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
