interface BufferedResponse {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: ArrayBuffer;
}

const inflightMisses = new Map<string, Promise<BufferedResponse>>();
const inflightRevalidations = new Set<string>();

function normalizeCacheKeyUrl(url: URL): string {
  const normalized = new URL(url.origin + url.pathname);
  const sortedParams = Array.from(url.searchParams.entries()).sort((a, b) =>
    a[0] === b[0]
      ? a[1] < b[1]
        ? -1
        : a[1] > b[1]
        ? 1
        : 0
      : a[0] < b[0]
      ? -1
      : 1
  );
  for (const [k, v] of sortedParams) {
    normalized.searchParams.append(k, v);
  }
  return normalized.toString();
}

function parseCacheControlTtl(cc: string): {
  freshSec: number;
  swrSec: number;
} {
  const sMaxMatch = cc.match(/(?:^|,)\s*s-maxage=(\d+)/i);
  const maxMatch = cc.match(/(?:^|,)\s*max-age=(\d+)/i);
  const swrMatch = cc.match(/(?:^|,)\s*stale-while-revalidate=(\d+)/i);
  const freshSec = sMaxMatch
    ? Number(sMaxMatch[1])
    : maxMatch
    ? Number(maxMatch[1])
    : 0;
  const swrSec = swrMatch ? Number(swrMatch[1]) : 0;
  return {
    freshSec: Number.isFinite(freshSec) ? freshSec : 0,
    swrSec: Number.isFinite(swrSec) ? swrSec : 0,
  };
}

function applyDefaultCacheControl(headers: Headers, pathname: string): void {
  if (headers.get("Cache-Control")) return;
  if (pathname.includes("/tmdb/")) {
    headers.set(
      "Cache-Control",
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    );
  } else if (pathname.includes("/vod/resolve")) {
    headers.set(
      "Cache-Control",
      "public, max-age=1800, s-maxage=3600, stale-while-revalidate=43200"
    );
  }
}

function buildEdgeCacheResponse(
  baseResponse: Response,
  outgoingHeaders: Headers
): Response | null {
  const clientCc = outgoingHeaders.get("Cache-Control") || "";
  const lowerCc = clientCc.toLowerCase();
  if (lowerCc.includes("no-store") || lowerCc.includes("private")) {
    return null;
  }

  const { freshSec, swrSec } = parseCacheControlTtl(clientCc);
  const storeHeaders = new Headers(outgoingHeaders);
  storeHeaders.delete("X-Cache-Status");

  // Store extended SWR entries cleanly so stale reads trigger async waitUntil revalidation
  // instead of a synchronous cold miss on Cloudflare's Cache API (which lacks native SWR).
  if (freshSec >= 300 && swrSec > 0) {
    storeHeaders.set("Cache-Control", `public, max-age=${freshSec + swrSec}`);
    storeHeaders.set("X-Cached-At", String(Date.now()));
    storeHeaders.set("X-Fresh-Ttl", String(freshSec));
    storeHeaders.set("X-Client-Cache-Control", clientCc);
  }

  return new Response(baseResponse.body, {
    status: baseResponse.status,
    statusText: baseResponse.statusText,
    headers: storeHeaders,
  });
}

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
    !url.pathname.includes("/sync/") &&
    !url.pathname.includes("/og/") &&
    !url.pathname.includes("/vod/ping/");

  const cache = typeof caches !== "undefined" ? (caches as any).default : null;
  const cacheUrl = isCacheableApiGet ? normalizeCacheKeyUrl(url) : "";
  const cacheKey = isCacheableApiGet
    ? new Request(cacheUrl, { method: "GET" })
    : null;

  if (cache && cacheKey) {
    try {
      const cached: Response | undefined = await cache.match(cacheKey);
      if (cached) {
        const cachedAt = Number(cached.headers.get("X-Cached-At") || 0);
        const freshTtl = Number(cached.headers.get("X-Fresh-Ttl") || 0);
        const clientCc = cached.headers.get("X-Client-Cache-Control");
        const isStale =
          freshTtl > 0 &&
          cachedAt > 0 &&
          (Date.now() - cachedAt) / 1000 > freshTtl;

        const outHeaders = new Headers(cached.headers);
        if (clientCc) {
          outHeaders.set("Cache-Control", clientCc);
        }
        outHeaders.delete("X-Cached-At");
        outHeaders.delete("X-Fresh-Ttl");
        outHeaders.delete("X-Client-Cache-Control");
        outHeaders.set("X-Cache-Status", isStale ? "STALE" : "HIT");
        outHeaders.set("Access-Control-Allow-Origin", "*");

        if (isStale && context.waitUntil && !inflightRevalidations.has(cacheUrl)) {
          inflightRevalidations.add(cacheUrl);
          const revalidatePromise = (async () => {
            try {
              const freshRes = await context.next();
              if (freshRes.status !== 200) return;
              const freshHeaders = new Headers(freshRes.headers);
              freshHeaders.set("Access-Control-Allow-Origin", "*");
              applyDefaultCacheControl(freshHeaders, url.pathname);
              const { freshSec } = parseCacheControlTtl(
                freshHeaders.get("Cache-Control") || ""
              );
              // Do not overwrite good stale cache with short s-maxage=60 empty-result fallback responses
              if (freshSec < 300) return;
              const toStore = buildEdgeCacheResponse(freshRes, freshHeaders);
              if (toStore) {
                await cache.put(cacheKey, toStore);
              }
            } catch {
              // Keep stale cache intact on background refresh errors
            } finally {
              inflightRevalidations.delete(cacheUrl);
            }
          })();
          try {
            context.waitUntil(revalidatePromise);
          } catch {
            inflightRevalidations.delete(cacheUrl);
          }
        }

        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers: outHeaders,
        });
      }
    } catch {}
  }

  if (!isCacheableApiGet) {
    const response = await context.next();
    const headers = new Headers(response.headers);
    if (!isVodProxy) {
      headers.set("Access-Control-Allow-Origin", "*");
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Isolate-level singleflight coalesces simultaneous cold cache misses for the same URL
  let inflight = inflightMisses.get(cacheUrl);
  if (!inflight) {
    inflight = (async () => {
      const response = await context.next();
      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin", "*");

      if (response.status === 200) {
        headers.set("X-Cache-Status", "MISS");
        applyDefaultCacheControl(headers, url.pathname);
      }

      const body = await response.arrayBuffer();

      if (response.status === 200 && cache && cacheKey) {
        const toStore = buildEdgeCacheResponse(
          new Response(body.slice(0), {
            status: response.status,
            statusText: response.statusText,
          }),
          headers
        );
        if (toStore) {
          if (context.waitUntil) {
            try {
              context.waitUntil(cache.put(cacheKey, toStore));
            } catch {}
          } else {
            cache.put(cacheKey, toStore).catch(() => {});
          }
        }
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(headers.entries()),
        body,
      };
    })().finally(() => {
      if (inflightMisses.get(cacheUrl) === inflight) {
        inflightMisses.delete(cacheUrl);
      }
    });
    inflightMisses.set(cacheUrl, inflight);
  }

  const result = await inflight;
  return new Response(result.body.slice(0), {
    status: result.status,
    statusText: result.statusText,
    headers: new Headers(result.headers),
  });
};
