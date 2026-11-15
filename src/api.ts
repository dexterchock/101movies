import {
  MediaItem,
  MediaDetails,
  TvboxConfigItem,
  VodSite,
  VodResolveResponse,
  ResolvedStreamSource,
  resolveGenreId,
} from "./types";

const REMOTE_API_ORIGIN = "https://101movies.pages.dev";
const DISABLED_SITES_KEY = "tvbox_disabled_sites";

function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function getStoredDisabledSiteIds(): string[] {
  try {
    const raw = localStorage.getItem(DISABLED_SITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

let localTmdbConfigured: boolean | null = null;

async function fetchJsonWithLocalFallback<T>(
  path: string,
  isConfiguredPayload: (data: any) => boolean,
  signal?: AbortSignal,
  canUseRemoteFallback = true
): Promise<T> {
  if (isLocalhost() && canUseRemoteFallback && localTmdbConfigured === false) {
    const remoteRes = await fetch(`${REMOTE_API_ORIGIN}${path}`, { signal });
    if (!remoteRes.ok) {
      throw new Error(`HTTP ${remoteRes.status}`);
    }
    return (await remoteRes.json()) as T;
  }

  const res = await fetch(path, { signal });
  if (!res.ok) {
    if (isLocalhost() && canUseRemoteFallback && res.status === 500) {
      // Allow local fallback only when local dev server lacks TMDB key, without poisoning valid transient errors
      let errData: any = null;
      try {
        errData = await res.json();
      } catch {}
      if (errData && !isConfiguredPayload(errData)) {
        localTmdbConfigured = false;
        const remoteRes = await fetch(`${REMOTE_API_ORIGIN}${path}`, { signal });
        if (!remoteRes.ok) {
          throw new Error(`HTTP ${remoteRes.status}`);
        }
        return (await remoteRes.json()) as T;
      }
    }
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();

  if (
    isLocalhost() &&
    canUseRemoteFallback &&
    !isConfiguredPayload(data)
  ) {
    localTmdbConfigured = false;
    const remoteRes = await fetch(`${REMOTE_API_ORIGIN}${path}`, { signal });
    if (!remoteRes.ok) {
      throw new Error(`HTTP ${remoteRes.status}`);
    }
    return (await remoteRes.json()) as T;
  }

  if (isLocalhost() && canUseRemoteFallback && isConfiguredPayload(data)) {
    localTmdbConfigured = true;
  }

  return data as T;
}

function setBoundedCache<K, V>(
  map: Map<K, V>,
  key: K,
  value: V,
  maxSize = 100
): void {
  if (map.size >= maxSize && !map.has(key)) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}

function addBoundedSet<T>(set: Set<T>, value: T, maxSize = 150): void {
  if (set.size >= maxSize && !set.has(value)) {
    const oldest = set.values().next().value;
    if (oldest !== undefined) set.delete(oldest);
  }
  set.add(value);
}

// In-memory caches
export const trendingMoviesCache = new Map<string, MediaItem[]>();
export const trendingTVCache = new Map<string, MediaItem[]>();
export const rankingsCache = new Map<string, MediaItem[]>();
export const searchCache = new Map<string, MediaItem[]>();
export const detailsCache = new Map<string, MediaDetails>();
export const vodResolveCache = new Map<string, VodResolveResponse>();
export const manifestResolutionCache = new Map<string, string>();
const prewarmedManifests = new Set<string>();

interface InflightEntry<T> {
  promise: Promise<T>;
  controller: AbortController;
  refs: number;
}

const detailsInflight = new Map<string, InflightEntry<MediaDetails>>();
const vodResolveInflight = new Map<string, InflightEntry<VodResolveResponse>>();

function combineAbortSignals(
  externalSignal: AbortSignal | undefined,
  entry: InflightEntry<any>,
  onRelease: () => void
): Promise<never> | null {
  if (!externalSignal) return null;
  if (externalSignal.aborted) {
    entry.refs--;
    if (entry.refs <= 0) {
      entry.controller.abort();
      onRelease();
    }
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  return null;
}

function awaitEntryWithSignal<T>(
  entry: InflightEntry<T>,
  externalSignal: AbortSignal | undefined,
  onEmptyAbort: () => void
): Promise<T> {
  entry.refs++;
  const immediateReject = combineAbortSignals(externalSignal, entry, onEmptyAbort);
  if (immediateReject) return immediateReject;

  if (!externalSignal) {
    return entry.promise.finally(() => {
      entry.refs--;
    });
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      entry.refs--;
      if (entry.refs <= 0) {
        entry.controller.abort();
        onEmptyAbort();
      }
      reject(new DOMException("Aborted", "AbortError"));
    };

    externalSignal.addEventListener("abort", onAbort, { once: true });

    entry.promise.then(
      (val) => {
        externalSignal.removeEventListener("abort", onAbort);
        entry.refs--;
        resolve(val);
      },
      (err) => {
        externalSignal.removeEventListener("abort", onAbort);
        entry.refs--;
        reject(err);
      }
    );
  });
}

function buildVodResolveKey(
  type: "movie" | "tv",
  id: string,
  customKeyword?: string,
  disabledIds: string[] = []
): string {
  const kw = customKeyword?.trim() || "";
  const dis = disabledIds.length > 0 ? disabledIds.join(",") : "";
  return `${type}_${id}_${kw}_${dis}`;
}

export function parseM3u8Resolution(text: string): string | undefined {
  const resMatch = text.match(/RESOLUTION=(\d+)x(\d+)/i);
  if (!resMatch) return undefined;
  const w = parseInt(resMatch[1], 10);
  const h = parseInt(resMatch[2], 10);
  if (w >= 3800 || h >= 2000) return "4K";
  if (w >= 2400 || h >= 1400) return "2K";
  if (w >= 1800 || h >= 800) return "1080P";
  if (w >= 1200 || h >= 600) return "720P";
  return undefined;
}

/**
 * Pre-warms the top resolved .m3u8 manifest in the background so HLS playback starts immediately.
 */
export function prewarmStreamManifests(
  sources: ResolvedStreamSource[],
  signal?: AbortSignal,
  onQuality?: (sourceId: string, quality: string) => void
): void {
  if (!sources || sources.length === 0) return;

  const firstM3u8Source = sources.find((src) => {
    const u = src.episodes?.[0]?.url;
    return Boolean(u && u.includes(".m3u8"));
  });
  if (!firstM3u8Source) return;

  const rawUrl = firstM3u8Source.episodes[0].url;
  const cachedQuality = manifestResolutionCache.get(firstM3u8Source.sourceId);
  if (cachedQuality) {
    onQuality?.(firstM3u8Source.sourceId, cachedQuality);
  }

  if (prewarmedManifests.has(rawUrl)) return;
  addBoundedSet(prewarmedManifests, rawUrl);

  const isHttpOnHttps =
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    rawUrl.startsWith("http://");
  const fetchUrl = isHttpOnHttps
    ? `/api/vod/proxy?url=${encodeURIComponent(rawUrl)}`
    : rawUrl;

  const timeoutSignal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(2500)
      : undefined;

  let combinedSignal = signal;
  if (signal && timeoutSignal && typeof (AbortSignal as any).any === "function") {
    combinedSignal = (AbortSignal as any).any([signal, timeoutSignal]);
  } else if (!signal) {
    combinedSignal = timeoutSignal;
  }

  fetch(fetchUrl, { signal: combinedSignal })
    .then(async (res) => {
      if (!res.ok) return;
      const text = await res.text();
      const detected = parseM3u8Resolution(text);
      if (detected) {
        setBoundedCache(manifestResolutionCache, firstM3u8Source.sourceId, detected, 100);
        onQuality?.(firstM3u8Source.sourceId, detected);
      }
    })
    .catch(() => {
      // Allow future retry if aborted early
      if (signal?.aborted) {
        prewarmedManifests.delete(rawUrl);
      }
    });
}

export const api = {
  getCachedTrendingMovies(genre?: string): MediaItem[] | undefined {
    return trendingMoviesCache.get(genre || "all");
  },
  getCachedTrendingTV(genre?: string): MediaItem[] | undefined {
    return trendingTVCache.get(genre || "all");
  },
  getCachedRankings(
    type: "movie" | "tv",
    year: number,
    genre?: string
  ): MediaItem[] | undefined {
    return rankingsCache.get(`${type}_${year}_${genre || "all"}`);
  },
  getCachedSearch(query: string): MediaItem[] | undefined {
    return searchCache.get(query.trim());
  },
  getCachedDetails(type: "movie" | "tv", id: string): MediaDetails | undefined {
    return detailsCache.get(`${type}_${id}`);
  },
  getCachedVodStreams(
    type: "movie" | "tv",
    id: string,
    customKeyword?: string,
    disabledIds: string[] = []
  ): VodResolveResponse | undefined {
    return vodResolveCache.get(buildVodResolveKey(type, id, customKeyword, disabledIds));
  },
  getCachedManifestQuality(sourceId: string): string | undefined {
    return manifestResolutionCache.get(sourceId);
  },
  setCachedManifestQuality(sourceId: string, quality: string): void {
    setBoundedCache(manifestResolutionCache, sourceId, quality, 100);
  },

  async getTrendingMovies(
    genre?: string,
    signal?: AbortSignal
  ): Promise<MediaItem[]> {
    const cacheKey = genre || "all";
    const cached = trendingMoviesCache.get(cacheKey);
    if (cached) return cached;

    const resolved = resolveGenreId("movie", genre);
    const query =
      resolved && resolved !== "all"
        ? `?genre=${encodeURIComponent(resolved)}&v=4`
        : "?v=4";
    const data = await fetchJsonWithLocalFallback<any>(
      `/api/tmdb/trending/movie${query}`,
      (d) => Array.isArray(d?.results) && d.results.length > 0,
      signal
    );
    const items = (data.results || []).map((item: MediaItem) => ({
      ...item,
      media_type: "movie" as const,
    }));
    if (items.length > 0) setBoundedCache(trendingMoviesCache, cacheKey, items, 40);
    return items;
  },

  async getTrendingTV(
    genre?: string,
    signal?: AbortSignal
  ): Promise<MediaItem[]> {
    const cacheKey = genre || "all";
    const cached = trendingTVCache.get(cacheKey);
    if (cached) return cached;

    const resolved = resolveGenreId("tv", genre);
    const query =
      resolved && resolved !== "all"
        ? `?genre=${encodeURIComponent(resolved)}&v=4`
        : "?v=4";
    const data = await fetchJsonWithLocalFallback<any>(
      `/api/tmdb/trending/tv${query}`,
      (d) => Array.isArray(d?.results) && d.results.length > 0,
      signal
    );
    const items = (data.results || []).map((item: MediaItem) => ({
      ...item,
      media_type: "tv" as const,
    }));
    if (items.length > 0) setBoundedCache(trendingTVCache, cacheKey, items, 40);
    return items;
  },

  async search(query: string, signal?: AbortSignal): Promise<MediaItem[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const cached = searchCache.get(trimmed);
    if (cached) return cached;

    const data = await fetchJsonWithLocalFallback<any>(
      `/api/tmdb/search?q=${encodeURIComponent(trimmed)}&v=4`,
      (d) => Array.isArray(d?.results) && d.results.length > 0,
      signal
    );
    const items: MediaItem[] = data.results || [];
    setBoundedCache(searchCache, trimmed, items, 60);
    return items;
  },

  async getDetails(
    type: "movie" | "tv",
    id: string,
    signal?: AbortSignal
  ): Promise<MediaDetails> {
    const key = `${type}_${id}`;
    const cached = detailsCache.get(key);
    if (cached) return cached;

    const existing = detailsInflight.get(key);
    if (existing) {
      return awaitEntryWithSignal(existing, signal, () => detailsInflight.delete(key));
    }

    const controller = new AbortController();
    const promise = fetchJsonWithLocalFallback<MediaDetails>(
      `/api/tmdb/${type}/${id}?v=4`,
      (d) => Boolean(d && (d.id || d.title || d.name)),
      controller.signal
    )
      .then((data) => {
        if (data && (data.id || data.title || data.name)) {
          setBoundedCache(detailsCache, key, data, 100);
        }
        return data;
      })
      .finally(() => {
        if (detailsInflight.get(key)?.controller === controller) {
          detailsInflight.delete(key);
        }
      });

    const entry: InflightEntry<MediaDetails> = { promise, controller, refs: 0 };
    detailsInflight.set(key, entry);
    return awaitEntryWithSignal(entry, signal, () => detailsInflight.delete(key));
  },

  async getRankings(
    type: "movie" | "tv",
    year: number,
    genre?: string,
    signal?: AbortSignal
  ): Promise<MediaItem[]> {
    const cacheKey = `${type}_${year}_${genre || "all"}`;
    const cached = rankingsCache.get(cacheKey);
    if (cached) return cached;

    const resolved = resolveGenreId(type, genre);
    const genreQuery =
      resolved && resolved !== "all"
        ? `&genre=${encodeURIComponent(resolved)}`
        : "";
    const data = await fetchJsonWithLocalFallback<any>(
      `/api/tmdb/discover/${type}?year=${year}${genreQuery}&v=4`,
      (d) => Array.isArray(d?.results) && d.results.length > 0,
      signal
    );
    const items: MediaItem[] = data.results || [];
    if (items.length > 0) setBoundedCache(rankingsCache, cacheKey, items, 80);
    return items;
  },

  async getTvboxConfigs(signal?: AbortSignal): Promise<{
    configs: TvboxConfigItem[];
    sites: VodSite[];
  }> {
    const res = await fetch("/api/tvbox/configs", { signal });
    return res.json();
  },

  async parseTvboxConfig(
    url: string,
    name?: string,
    signal?: AbortSignal
  ): Promise<{
    result: {
      ok: boolean;
      type: "single" | "multi" | "unknown";
      totalSites: number;
      extractedSites: VodSite[];
      subRepos?: { name: string; url: string }[];
      message?: string;
    };
    sites: VodSite[];
  }> {
    const res = await fetch("/api/tvbox/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name }),
      signal,
    });
    return res.json();
  },

  async pingVodSite(
    siteId: string,
    signal?: AbortSignal
  ): Promise<{ id: string; ok: boolean; latencyMs: number }> {
    const res = await fetch(`/api/vod/ping/${encodeURIComponent(siteId)}`, {
      signal,
    });
    return res.json();
  },

  async resolveVodStreams(
    type: "movie" | "tv",
    id: string,
    customKeyword?: string,
    disabledIds: string[] = [],
    signal?: AbortSignal
  ): Promise<VodResolveResponse> {
    const key = buildVodResolveKey(type, id, customKeyword, disabledIds);
    const cached = vodResolveCache.get(key);
    if (cached) return cached;

    const existing = vodResolveInflight.get(key);
    if (existing) {
      return awaitEntryWithSignal(existing, signal, () =>
        vodResolveInflight.delete(key)
      );
    }

    const queryParts = [
      `type=${encodeURIComponent(type)}`,
      `id=${encodeURIComponent(id)}`,
    ];
    if (customKeyword && customKeyword.trim()) {
      queryParts.push(`wd=${encodeURIComponent(customKeyword.trim())}`);
    }
    if (disabledIds.length > 0) {
      queryParts.push(`disabled=${encodeURIComponent(disabledIds.join(","))}`);
    }

    const controller = new AbortController();
    const hasCustomKeyword = Boolean(customKeyword && customKeyword.trim());
    const promise = fetchJsonWithLocalFallback<VodResolveResponse>(
      `/api/vod/resolve?${queryParts.join("&")}`,
      (d) => Array.isArray(d?.sources) && d.sources.length > 0,
      controller.signal,
      !hasCustomKeyword
    )
      .then((data) => {
        if (data && Array.isArray(data.sources) && data.sources.length > 0) {
          setBoundedCache(vodResolveCache, key, data, 80);
        }
        return data;
      })
      .finally(() => {
        if (vodResolveInflight.get(key)?.controller === controller) {
          vodResolveInflight.delete(key);
        }
      });

    const entry: InflightEntry<VodResolveResponse> = {
      promise,
      controller,
      refs: 0,
    };
    vodResolveInflight.set(key, entry);
    return awaitEntryWithSignal(entry, signal, () =>
      vodResolveInflight.delete(key)
    );
  },

  /**
   * Silently prefetches movie/TV details and VOD stream resolution into memory cache
   * and pre-warms the primary .m3u8 manifest.
   */
  prefetchMediaIntent(type: "movie" | "tv", id: string): void {
    const disabledIds = getStoredDisabledSiteIds();
    this.getDetails(type, id).catch(() => {});
    this.resolveVodStreams(type, id, undefined, disabledIds)
      .then((res) => {
        if (res?.sources?.length) {
          prewarmStreamManifests(res.sources);
        }
      })
      .catch(() => {});
  },
};
