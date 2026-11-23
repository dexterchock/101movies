import {
  fetchMediaDetails,
  fetchTmdb,
  fetchTrendingHk,
  getTmdbKey,
  resolveTmdbGenre,
} from "../functions/_shared/tmdb.js";
import { searchTmdbWithVodAvailability } from "../functions/_shared/tmdbSearch.js";
import { resolveStreamsForMedia } from "../functions/_shared/tvboxService.js";
import { handleVodProxyRequest } from "../functions/_shared/vodProxy.js";

const PAGES_PREVIEW_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.101movies\.pages\.dev$/i;
const ALLOWED_PROXY_ORIGINS = new Set([
  "https://101movies.pages.dev",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function resolveRequestPath(url: URL): string {
  const rawPath =
    url.pathname !== "/api/index" && url.pathname !== "/api"
      ? url.pathname
      : "/api/" + (url.searchParams.get("__path") || "").replace(/^\/+/, "");
  return rawPath.replace(/\/+$/, "") || "/api";
}

function resolveProxyCorsOrigin(request: Request, url: URL): string {
  const origin = (request.headers.get("origin") || "").trim();
  if (!origin) return url.origin;
  if (
    origin === url.origin ||
    ALLOWED_PROXY_ORIGINS.has(origin) ||
    PAGES_PREVIEW_ORIGIN_RE.test(origin)
  ) {
    return origin;
  }
  return url.origin;
}

function jsonWithCors(
  data: unknown,
  options?: { status?: number; cacheControl?: string }
): Response {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
  };
  if (options?.cacheControl) {
    headers["Cache-Control"] = options.cacheControl;
  }
  return Response.json(data, {
    status: options?.status ?? 200,
    headers,
  });
}

async function handleTrendingRequest(
  type: "movie" | "tv",
  url: URL,
  apiKey: string
): Promise<Response> {
  const genre = url.searchParams.get("genre")?.trim() || "";

  if (genre.toLowerCase() === "hk") {
    if (!apiKey) {
      return jsonWithCors(
        { results: [] },
        { cacheControl: "public, max-age=0, s-maxage=60" }
      );
    }
    try {
      const results = await fetchTrendingHk(type, apiKey);
      return jsonWithCors(
        {
          page: 1,
          results,
          total_pages: 1,
          total_results: results.length,
        },
        {
          cacheControl:
            results.length > 0
              ? "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400"
              : "public, max-age=0, s-maxage=60",
        }
      );
    } catch (err) {
      console.error(err);
      return jsonWithCors(
        {
          error:
            type === "tv"
              ? "Failed to fetch HK dramas from TMDB"
              : "Failed to fetch HK movies from TMDB",
        },
        { status: 500 }
      );
    }
  }

  try {
    let data: any;
    if (genre && genre !== "all") {
      const resolvedGenre = resolveTmdbGenre(type, genre);
      data = await fetchTmdb(
        `/discover/${type}?sort_by=popularity.desc&vote_count.gte=10&with_genres=${encodeURIComponent(
          resolvedGenre
        )}`,
        type,
        apiKey
      );
    } else {
      data = await fetchTmdb(`/trending/${type}/week`, type, apiKey);
    }
    const hasResults = Array.isArray(data?.results) && data.results.length > 0;
    return jsonWithCors(data, {
      cacheControl: hasResults
        ? "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400"
        : "public, max-age=0, s-maxage=60",
    });
  } catch (err) {
    console.error(err);
    return jsonWithCors({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
}

async function handleDiscoverRequest(
  type: "movie" | "tv",
  url: URL,
  apiKey: string
): Promise<Response> {
  const year = url.searchParams.get("year") || String(new Date().getFullYear());
  const genre = url.searchParams.get("genre")?.trim() || "";

  const yearParam =
    type === "tv"
      ? `first_air_date_year=${encodeURIComponent(year)}`
      : `primary_release_year=${encodeURIComponent(year)}`;

  const isHk = genre.toLowerCase() === "hk";
  let genreParam = "";
  if (isHk) {
    genreParam = "&with_origin_country=HK";
  } else if (genre && genre !== "all") {
    const resolvedGenre = resolveTmdbGenre(type, genre);
    genreParam = `&with_genres=${encodeURIComponent(resolvedGenre)}`;
  }

  const minVotes = isHk ? 1 : 3;
  const discoverMinVotes = isHk ? 1 : 10;

  try {
    const data = await fetchTmdb(
      `/discover/${type}?sort_by=popularity.desc&vote_count.gte=${discoverMinVotes}&${yearParam}${genreParam}`,
      type,
      apiKey,
      minVotes
    );
    const hasResults = Array.isArray(data?.results) && data.results.length > 0;
    return jsonWithCors(data, {
      cacheControl: hasResults
        ? "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400"
        : "public, max-age=0, s-maxage=60",
    });
  } catch (err) {
    console.error(err);
    return jsonWithCors({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
}

async function handleDetailsRequest(
  type: "movie" | "tv",
  id: string,
  apiKey: string
): Promise<Response> {
  if (!id || !apiKey) {
    return jsonWithCors({}, { cacheControl: "public, max-age=0, s-maxage=60" });
  }

  try {
    const details = await fetchMediaDetails(type, id, apiKey);
    const hasDetails = Boolean(
      details && details.id && details.success !== false
    );
    return jsonWithCors(details, {
      cacheControl: hasDetails
        ? "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
        : "public, max-age=0, s-maxage=60",
    });
  } catch (err) {
    console.error(err);
    return jsonWithCors(
      {
        error:
          type === "tv"
            ? "Failed to fetch TV details from TMDB"
            : "Failed to fetch movie details from TMDB",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = resolveRequestPath(url);
  const isVodProxy = path === "/api/vod/proxy";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": isVodProxy
      ? resolveProxyCorsOrigin(request, url)
      : "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Max-Age": "86400",
  };
  if (isVodProxy) {
    headers["Vary"] = "Origin";
  }
  return new Response(null, { status: 204, headers });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = resolveRequestPath(url);
  const apiKey = getTmdbKey();

  if (path === "/api/health") {
    return jsonWithCors(
      { ok: true, provider: "vercel-backup" },
      { cacheControl: "no-store" }
    );
  }

  if (path === "/api/tmdb/trending/movie") {
    return handleTrendingRequest("movie", url, apiKey);
  }

  if (path === "/api/tmdb/trending/tv") {
    return handleTrendingRequest("tv", url, apiKey);
  }

  const discoverMatch = path.match(/^\/api\/tmdb\/discover\/(movie|tv)$/);
  if (discoverMatch) {
    return handleDiscoverRequest(discoverMatch[1] as "movie" | "tv", url, apiKey);
  }

  if (path === "/api/tmdb/search") {
    const query = url.searchParams.get("q")?.trim() || "";
    if (!query || !apiKey) {
      return jsonWithCors(
        { results: [] },
        { cacheControl: "public, max-age=0, s-maxage=60" }
      );
    }
    try {
      const verified = await searchTmdbWithVodAvailability(query, apiKey);
      const hasResults = Array.isArray(verified) && verified.length > 0;
      return jsonWithCors(
        { page: 1, results: verified },
        {
          cacheControl: hasResults
            ? "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400"
            : "public, max-age=0, s-maxage=60",
        }
      );
    } catch (err) {
      console.error(err);
      return jsonWithCors({ error: "Failed to fetch from TMDB" }, { status: 500 });
    }
  }

  const detailsMatch = path.match(/^\/api\/tmdb\/(movie|tv)\/([^/]+)$/);
  if (detailsMatch) {
    return handleDetailsRequest(
      detailsMatch[1] as "movie" | "tv",
      decodeURIComponent(detailsMatch[2]),
      apiKey
    );
  }

  if (path === "/api/vod/resolve") {
    const typeParam = url.searchParams.get("type");
    const type: "tv" | "movie" = typeParam === "tv" ? "tv" : "movie";
    const tmdbId = url.searchParams.get("id") || "";
    const customKeyword = url.searchParams.get("wd") || undefined;
    const disabledStr = url.searchParams.get("disabled") || "";
    const disabledSiteIds = disabledStr
      ? disabledStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    try {
      const resolved = await resolveStreamsForMedia({
        tmdbId,
        type,
        customKeyword,
        disabledSiteIds,
        tmdbApiKey: apiKey,
      });
      const hasSources =
        Array.isArray(resolved?.sources) && resolved.sources.length > 0;
      return jsonWithCors(resolved, {
        cacheControl: hasSources
          ? "public, max-age=1800, s-maxage=3600, stale-while-revalidate=43200"
          : "public, max-age=0, s-maxage=60",
      });
    } catch (err) {
      console.error("Failed to resolve VOD streams:", err);
      return jsonWithCors(
        { error: "Failed to resolve VOD streams" },
        { status: 500 }
      );
    }
  }

  if (path === "/api/vod/proxy") {
    return handleVodProxyRequest({
      targetUrl: url.searchParams.get("url") || "",
      reqOrigin: url.origin,
      allowedCorsOrigin: resolveProxyCorsOrigin(request, url),
      rangeHeader: request.headers.get("Range"),
      mode: "manifest",
      manifestOnlyEnforced: true,
      timeoutMs: 12000,
    });
  }

  return jsonWithCors({ error: "Not found" }, { status: 404 });
}
