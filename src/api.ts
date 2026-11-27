import {
  MediaItem,
  MediaDetails,
  VodResolveResponse,
  ResolvedStreamSource,
  resolveGenreId,
} from "./types";

const REMOTE_API_ORIGIN = "https://101movies.pages.dev";
const BACKUP_UNTIL_KEY = "api_backup_until";
const BACKUP_ORIGIN_OVERRIDE_KEY = "backup_api_origin";
const BACKUP_FAILOVER_TTL_MS = 30 * 60 * 1000;
const PRIMARY_FAILOVER_TIMEOUT_MS = 18_000;

const API_LS_PREFIX = "api_cache_v6:";
const API_SS_PREFIX = "api_search_v6:";
const API_LS_MAX_ENTRIES = 45;
const API_SS_MAX_ENTRIES = 25;

const TRENDING_TTL_MS = 30 * 60 * 1000;
const RANKINGS_TTL_MS = 60 * 60 * 1000;
const DETAILS_TTL_MS = 6 * 60 * 60 * 1000;
const VOD_RESOLVE_TTL_MS = 60 * 60 * 1000;
const SEARCH_TTL_MS = 15 * 60 * 1000;

function normalizeOrigin(raw: string): string {
  const trimmed = (raw || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (
    /^https:\/\/[^/\s]+$/i.test(trimmed) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)
  ) {
    return trimmed;
  }
  return "";
}

const ENV_BACKUP_API_ORIGIN = normalizeOrigin(
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_BACKUP_API_ORIGIN) ||
    ""
);

declare global {
  interface Window {
    __EARLY_FETCH__?: Record<string, Promise<Response>>;
  }
}

function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function getBackupApiOrigin(): string {
  if (typeof window !== "undefined") {
    try {
      const override = window.localStorage?.getItem(BACKUP_ORIGIN_OVERRIDE_KEY);
      if (override) {
        const normalized = normalizeOrigin(override);
        if (normalized) return normalized;
      }
    } catch {}
  }
  return ENV_BACKUP_API_ORIGIN;
}

export function isBackupApiActive(): boolean {
  const backupOrigin = getBackupApiOrigin();
  if (!backupOrigin || typeof window === "undefined") return false;
  try {
    const until = Number(window.sessionStorage?.getItem(BACKUP_UNTIL_KEY) || 0);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

export function activateBackupApi(ttlMs = BACKUP_FAILOVER_TTL_MS): boolean {
  const backupOrigin = getBackupApiOrigin();
  if (!backupOrigin || typeof window === "undefined") return false;
  try {
    window.sessionStorage?.setItem(
      BACKUP_UNTIL_KEY,
      String(Date.now() + ttlMs)
    );
    return true;
  } catch {
    return false;
  }
}

export function getBackupVodProxyUrl(targetUrl: string): string | null {
  if (isLocalhost()) return null;
  const backupOrigin = getBackupApiOrigin();
  if (!backupOrigin) return null;
  return `${backupOrigin}/api/vod/proxy?mode=manifest&url=${encodeURIComponent(
    targetUrl
  )}`;
}

export function buildVodProxyUrl(
  targetUrl: string,
  mode: "full" | "manifest" = "full"
): string {
  if (isBackupApiActive()) {
    const backupProxyUrl = getBackupVodProxyUrl(targetUrl);
    if (backupProxyUrl) return backupProxyUrl;
  }
  const encoded = encodeURIComponent(targetUrl);
  return mode === "manifest"
    ? `/api/vod/proxy?mode=manifest&url=${encoded}`
    : `/api/vod/proxy?url=${encoded}`;
}

function getStorage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function getCachePrefix(kind: "local" | "session"): string {
  return kind === "local" ? API_LS_PREFIX : API_SS_PREFIX;
}

function readPersistentCache<T>(
  kind: "local" | "session",
  key: string
): T | undefined {
  const storage = getStorage(kind);
  if (!storage) return undefined;
  const fullKey = getCachePrefix(kind) + key;
  try {
    const raw = storage.getItem(fullKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { e?: number; d?: T };
    if (!parsed || typeof parsed.e !== "number" || parsed.e <= Date.now()) {
      storage.removeItem(fullKey);
      return undefined;
    }
    return parsed.d;
  } catch {
    try {
      storage.removeItem(fullKey);
    } catch {}
    return undefined;
  }
}

function prunePersistentPrefix(
  storage: Storage,
  prefix: string,
  maxEntries: number
): void {
  const now = Date.now();
  const entries: { key: string; exp: number }[] = [];

  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (!k || k.indexOf(prefix) !== 0) continue;
    let exp = 0;
    try {
      const raw = storage.getItem(k);
      const parsed = raw ? (JSON.parse(raw) as { e?: number }) : null;
      exp = parsed && typeof parsed.e === "number" ? parsed.e : 0;
    } catch {}
    if (exp <= now) {
      entries.push({ key: k, exp: -1 });
    } else {
      entries.push({ key: k, exp });
    }
  }

  for (let i = 0; i < entries.length; i++) {
    if (entries[i].exp < 0) {
      try {
        storage.removeItem(entries[i].key);
      } catch {}
    }
  }

  const valid = entries
    .filter((item) => item.exp >= 0)
    .sort((a, b) => a.exp - b.exp);

  const excess = valid.length - maxEntries;
  for (let i = 0; i < excess; i++) {
    try {
      storage.removeItem(valid[i].key);
    } catch {}
  }
}

function writePersistentCache<T>(
  kind: "local" | "session",
  key: string,
  data: T,
  ttlMs: number
): void {
  const storage = getStorage(kind);
  if (!storage) return;
  const prefix = getCachePrefix(kind);
  const maxEntries = kind === "local" ? API_LS_MAX_ENTRIES : API_SS_MAX_ENTRIES;
  const fullKey = prefix + key;
  const payload = JSON.stringify({ e: Date.now() + ttlMs, d: data });

  try {
    prunePersistentPrefix(storage, prefix, maxEntries - 1);
    storage.setItem(fullKey, payload);
  } catch {
    // QuotaExceededError: evict half of our prefix-only cache entries and retry once
    try {
      prunePersistentPrefix(storage, prefix, Math.floor(maxEntries / 2));
      storage.setItem(fullKey, payload);
    } catch {}
  }
}

let localTmdbConfigured: boolean | null = null;

function getPrimaryFailoverTimeoutMs(): number {
  if (typeof window !== "undefined") {
    const override = Number((window as any).__PRIMARY_API_TIMEOUT_MS__);
    if (Number.isFinite(override) && override > 0) {
      return override;
    }
  }
  return PRIMARY_FAILOVER_TIMEOUT_MS;
}

function isQuotaOrFailOpenResponse(res: Response): boolean {
  if (
    res.status === 429 ||
    res.status === 502 ||
    res.status === 503 ||
    res.status === 504 ||
    (res.status >= 520 && res.status <= 530)
  ) {
    return true;
  }
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const isJson = ct.includes("json");
  // Legitimate API Functions return JSON; non-JSON 200/404/5xx indicates fail_open SPA fallback or Cloudflare error HTML
  if (!isJson && (res.ok || res.status === 404 || res.status >= 500)) {
    return true;
  }
  return false;
}

async function fetchJsonFromOrigin<T>(
  fullUrl: string,
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(fullUrl, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("json")) {
    throw new Error("Non-JSON API response");
  }
  return (await res.json()) as T;
}

async function consumeEarlyFetch(
  path: string,
  signal?: AbortSignal
): Promise<Response | null> {
  if (typeof window === "undefined") return null;
  const store = window.__EARLY_FETCH__;
  const earlyPromise = store?.[path];
  if (!earlyPromise) return null;
  delete store[path];

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  try {
    const res = signal
      ? await new Promise<Response>((resolve, reject) => {
          const onAbort = () =>
            reject(new DOMException("Aborted", "AbortError"));
          signal.addEventListener("abort", onAbort, { once: true });
          earlyPromise.then(
            (r) => {
              signal.removeEventListener("abort", onAbort);
              resolve(r);
            },
            (err) => {
              signal.removeEventListener("abort", onAbort);
              reject(err);
            }
          );
        })
      : await earlyPromise;
    return res;
  } catch (err: any) {
    if (err?.name === "AbortError" || signal?.aborted) {
      throw err;
    }
    return null;
  }
}

async function fetchPrimaryWithTimeout(
  path: string,
  externalSignal?: AbortSignal
): Promise<Response> {
  if (externalSignal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const controller = new AbortController();
  let abortedByCaller = false;
  let timedOut = false;

  const onExternalAbort = () => {
    abortedByCaller = true;
    controller.abort();
  };
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, getPrimaryFailoverTimeoutMs());

  try {
    const earlyRes = await consumeEarlyFetch(path, controller.signal);
    return earlyRes || (await fetch(path, { signal: controller.signal }));
  } catch (err: any) {
    if (abortedByCaller || externalSignal?.aborted) {
      throw err?.name === "AbortError"
        ? err
        : new DOMException("Aborted", "AbortError");
    }
    if (timedOut) {
      throw new Error("Primary API timeout");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

async function fetchJsonWithLocalFallback<T>(
  path: string,
  isConfiguredPayload: (data: any) => boolean,
  signal?: AbortSignal,
  canUseRemoteFallback = true
): Promise<T> {
  const backupOrigin = getBackupApiOrigin();

  if (isLocalhost() && canUseRemoteFallback && localTmdbConfigured === false) {
    try {
      return await fetchJsonFromOrigin<T>(`${REMOTE_API_ORIGIN}${path}`, signal);
    } catch (err: any) {
      if (err?.name === "AbortError" || signal?.aborted || !backupOrigin) {
        throw err;
      }
      return fetchJsonFromOrigin<T>(`${backupOrigin}${path}`, signal);
    }
  }

  if (!isLocalhost() && backupOrigin && isBackupApiActive()) {
    return fetchJsonFromOrigin<T>(`${backupOrigin}${path}`, signal);
  }

  let res: Response;
  try {
    if (!isLocalhost() && backupOrigin) {
      res = await fetchPrimaryWithTimeout(path, signal);
    } else {
      const earlyRes = !isLocalhost() ? await consumeEarlyFetch(path, signal) : null;
      res = earlyRes || (await fetch(path, { signal }));
    }
  } catch (err: any) {
    if (
      err?.name !== "AbortError" &&
      !signal?.aborted &&
      !isLocalhost() &&
      backupOrigin
    ) {
      activateBackupApi();
      return fetchJsonFromOrigin<T>(`${backupOrigin}${path}`, signal);
    }
    throw err;
  }

  if (!isLocalhost() && isQuotaOrFailOpenResponse(res)) {
    if (backupOrigin) {
      activateBackupApi();
      return fetchJsonFromOrigin<T>(`${backupOrigin}${path}`, signal);
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    throw new Error("Non-JSON API response");
  }

  if (!res.ok) {
    if (isLocalhost() && canUseRemoteFallback && res.status === 500) {
      // Allow local fallback only when local dev server lacks TMDB key, without poisoning valid transient errors
      let errData: any = null;
      try {
        errData = await res.json();
      } catch {}
      if (errData && !isConfiguredPayload(errData)) {
        localTmdbConfigured = false;
        return fetchJsonFromOrigin<T>(`${REMOTE_API_ORIGIN}${path}`, signal);
      }
    }
    throw new Error(`HTTP ${res.status}`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    if (!signal?.aborted && !isLocalhost() && backupOrigin) {
      activateBackupApi();
      return fetchJsonFromOrigin<T>(`${backupOrigin}${path}`, signal);
    }
    throw err;
  }

  if (
    isLocalhost() &&
    canUseRemoteFallback &&
    !isConfiguredPayload(data)
  ) {
    localTmdbConfigured = false;
    return fetchJsonFromOrigin<T>(`${REMOTE_API_ORIGIN}${path}`, signal);
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
  const cachedQuality = manifestResolutionCache.get(rawUrl);
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
    ? buildVodProxyUrl(rawUrl, "full")
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
        setBoundedCache(manifestResolutionCache, rawUrl, detected, 150);
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

function buildTrendingPath(type: "movie" | "tv", genre?: string): string {
  const resolved = resolveGenreId(type, genre);
  const query =
    resolved && resolved !== "all"
      ? `?genre=${encodeURIComponent(resolved)}&v=6`
      : "?v=6";
  return `/api/tmdb/trending/${type}${query}`;
}

function buildRankingsPath(
  type: "movie" | "tv",
  year: number,
  genre?: string
): string {
  const resolved = resolveGenreId(type, genre);
  const genreQuery =
    resolved && resolved !== "all"
      ? `&genre=${encodeURIComponent(resolved)}`
      : "";
  return `/api/tmdb/discover/${type}?year=${year}${genreQuery}&v=6`;
}

function buildSearchPath(trimmedQuery: string): string {
  return `/api/tmdb/search?q=${encodeURIComponent(trimmedQuery)}&v=6`;
}

function buildDetailsPath(type: "movie" | "tv", id: string): string {
  return `/api/tmdb/${type}/${encodeURIComponent(id)}?v=6`;
}

export const api = {
  getCachedTrendingMovies(genre?: string): MediaItem[] | undefined {
    const cacheKey = genre || "all";
    const ram = trendingMoviesCache.get(cacheKey);
    if (ram) return ram;
    const disk = readPersistentCache<MediaItem[]>(
      "local",
      buildTrendingPath("movie", genre)
    );
    if (disk && disk.length > 0) {
      setBoundedCache(trendingMoviesCache, cacheKey, disk, 40);
      return disk;
    }
    return undefined;
  },
  getCachedTrendingTV(genre?: string): MediaItem[] | undefined {
    const cacheKey = genre || "all";
    const ram = trendingTVCache.get(cacheKey);
    if (ram) return ram;
    const disk = readPersistentCache<MediaItem[]>(
      "local",
      buildTrendingPath("tv", genre)
    );
    if (disk && disk.length > 0) {
      setBoundedCache(trendingTVCache, cacheKey, disk, 40);
      return disk;
    }
    return undefined;
  },
  getCachedRankings(
    type: "movie" | "tv",
    year: number,
    genre?: string
  ): MediaItem[] | undefined {
    const cacheKey = `${type}_${year}_${genre || "all"}`;
    const ram = rankingsCache.get(cacheKey);
    if (ram) return ram;
    const disk = readPersistentCache<MediaItem[]>(
      "local",
      buildRankingsPath(type, year, genre)
    );
    if (disk && disk.length > 0) {
      setBoundedCache(rankingsCache, cacheKey, disk, 80);
      return disk;
    }
    return undefined;
  },
  getCachedSearch(query: string): MediaItem[] | undefined {
    const trimmed = query.trim();
    if (!trimmed) return undefined;
    const ram = searchCache.get(trimmed);
    if (ram) return ram;
    const disk = readPersistentCache<MediaItem[]>(
      "session",
      buildSearchPath(trimmed)
    );
    if (disk && disk.length > 0) {
      setBoundedCache(searchCache, trimmed, disk, 60);
      return disk;
    }
    return undefined;
  },
  getCachedDetails(type: "movie" | "tv", id: string): MediaDetails | undefined {
    const key = `${type}_${id}`;
    const ram = detailsCache.get(key);
    if (ram) return ram;
    const disk = readPersistentCache<MediaDetails>(
      "local",
      buildDetailsPath(type, id)
    );
    if (disk && (disk.id || disk.title || disk.name)) {
      setBoundedCache(detailsCache, key, disk, 100);
      return disk;
    }
    return undefined;
  },
  getPreviewItem(type: "movie" | "tv", id: string): MediaItem | undefined {
    const pools: [Map<string, MediaItem[]>, "movie" | "tv" | null][] = [
      [trendingMoviesCache, "movie"],
      [trendingTVCache, "tv"],
      [rankingsCache, null],
      [searchCache, null],
    ];
    for (const [pool, fixedType] of pools) {
      for (const [poolKey, list] of pool.entries()) {
        for (const item of list) {
          if (String(item.id) !== id) continue;
          const inferredType =
            item.media_type ||
            fixedType ||
            (poolKey.startsWith("tv_") ? "tv" : item.title ? "movie" : "tv");
          if (inferredType === type) return item;
        }
      }
    }
    return undefined;
  },
  getCachedVodStreams(
    type: "movie" | "tv",
    id: string,
    customKeyword?: string,
    disabledIds: string[] = []
  ): VodResolveResponse | undefined {
    const key = buildVodResolveKey(type, id, customKeyword, disabledIds);
    const ram = vodResolveCache.get(key);
    if (ram) return ram;
    if (!customKeyword?.trim() && disabledIds.length === 0) {
      const apiPath = `/api/vod/resolve?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&v=9`;
      const disk = readPersistentCache<VodResolveResponse>("local", apiPath);
      if (disk && Array.isArray(disk.sources) && disk.sources.length > 0) {
        setBoundedCache(vodResolveCache, key, disk, 80);
        return disk;
      }
    }
    return undefined;
  },
  getCachedManifestQuality(url?: string): string | undefined {
    return url ? manifestResolutionCache.get(url) : undefined;
  },
  setCachedManifestQuality(url: string, quality: string): void {
    if (url) setBoundedCache(manifestResolutionCache, url, quality, 150);
  },

  async getTrendingMovies(
    genre?: string,
    signal?: AbortSignal
  ): Promise<MediaItem[]> {
    const cacheKey = genre || "all";
    const apiPath = buildTrendingPath("movie", genre);
    const cached = this.getCachedTrendingMovies(genre);
    if (cached) return cached;

    const data = await fetchJsonWithLocalFallback<any>(
      apiPath,
      (d) => Array.isArray(d?.results) && d.results.length > 0,
      signal
    );
    const items = (data.results || []).map((item: MediaItem) => ({
      ...item,
      media_type: "movie" as const,
    }));
    if (items.length > 0) {
      setBoundedCache(trendingMoviesCache, cacheKey, items, 40);
      writePersistentCache("local", apiPath, items, TRENDING_TTL_MS);
    }
    return items;
  },

  async getTrendingTV(
    genre?: string,
    signal?: AbortSignal
  ): Promise<MediaItem[]> {
    const cacheKey = genre || "all";
    const apiPath = buildTrendingPath("tv", genre);
    const cached = this.getCachedTrendingTV(genre);
    if (cached) return cached;

    const data = await fetchJsonWithLocalFallback<any>(
      apiPath,
      (d) => Array.isArray(d?.results) && d.results.length > 0,
      signal
    );
    const items = (data.results || []).map((item: MediaItem) => ({
      ...item,
      media_type: "tv" as const,
    }));
    if (items.length > 0) {
      setBoundedCache(trendingTVCache, cacheKey, items, 40);
      writePersistentCache("local", apiPath, items, TRENDING_TTL_MS);
    }
    return items;
  },

  async search(query: string, signal?: AbortSignal): Promise<MediaItem[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const cached = this.getCachedSearch(trimmed);
    if (cached) return cached;

    const apiPath = buildSearchPath(trimmed);
    const data = await fetchJsonWithLocalFallback<any>(
      apiPath,
      (d) => Array.isArray(d?.results) && d.results.length > 0,
      signal
    );
    const items: MediaItem[] = data.results || [];
    if (items.length > 0) {
      setBoundedCache(searchCache, trimmed, items, 60);
      writePersistentCache("session", apiPath, items, SEARCH_TTL_MS);
    }
    return items;
  },

  async getDetails(
    type: "movie" | "tv",
    id: string,
    signal?: AbortSignal
  ): Promise<MediaDetails> {
    const key = `${type}_${id}`;
    const apiPath = buildDetailsPath(type, id);
    const cached = this.getCachedDetails(type, id);
    if (cached) return cached;

    const existing = detailsInflight.get(key);
    if (existing) {
      return awaitEntryWithSignal(existing, signal, () => detailsInflight.delete(key));
    }

    const controller = new AbortController();
    const promise = fetchJsonWithLocalFallback<MediaDetails>(
      apiPath,
      (d) => Boolean(d && (d.id || d.title || d.name)),
      controller.signal
    )
      .then((data) => {
        if (data && (data.id || data.title || data.name)) {
          setBoundedCache(detailsCache, key, data, 100);
          writePersistentCache("local", apiPath, data, DETAILS_TTL_MS);
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
    const apiPath = buildRankingsPath(type, year, genre);
    const cached = this.getCachedRankings(type, year, genre);
    if (cached) return cached;

    const data = await fetchJsonWithLocalFallback<any>(
      apiPath,
      (d) => Array.isArray(d?.results) && d.results.length > 0,
      signal
    );
    const items: MediaItem[] = data.results || [];
    if (items.length > 0) {
      setBoundedCache(rankingsCache, cacheKey, items, 80);
      writePersistentCache("local", apiPath, items, RANKINGS_TTL_MS);
    }
    return items;
  },

  async resolveVodStreams(
    type: "movie" | "tv",
    id: string,
    customKeyword?: string,
    disabledIds: string[] = [],
    signal?: AbortSignal,
    bypassCache = false
  ): Promise<VodResolveResponse> {
    const key = buildVodResolveKey(type, id, customKeyword, disabledIds);
    if (bypassCache) {
      vodResolveCache.delete(key);
    } else {
      const cached = this.getCachedVodStreams(
        type,
        id,
        customKeyword,
        disabledIds
      );
      if (cached) return cached;
    }

    const existing = vodResolveInflight.get(key);
    if (existing) {
      return awaitEntryWithSignal(existing, signal, () =>
        vodResolveInflight.delete(key)
      );
    }

    const queryParts = [
      `type=${encodeURIComponent(type)}`,
      `id=${encodeURIComponent(id)}`,
      "v=9",
    ];
    if (customKeyword && customKeyword.trim()) {
      queryParts.push(`wd=${encodeURIComponent(customKeyword.trim())}`);
    }
    if (disabledIds.length > 0) {
      queryParts.push(`disabled=${encodeURIComponent(disabledIds.join(","))}`);
    }
    if (bypassCache) {
      queryParts.push(`_r=${Date.now()}`);
    }

    const apiPath = `/api/vod/resolve?${queryParts.join("&")}`;
    const controller = new AbortController();
    const hasCustomKeyword = Boolean(customKeyword && customKeyword.trim());
    const canPersistVod = !hasCustomKeyword && disabledIds.length === 0;
    const promise = fetchJsonWithLocalFallback<VodResolveResponse>(
      apiPath,
      (d) => Array.isArray(d?.sources) && d.sources.length > 0,
      controller.signal,
      !hasCustomKeyword
    )
      .then((data) => {
        if (data && Array.isArray(data.sources) && data.sources.length > 0) {
          setBoundedCache(vodResolveCache, key, data, 80);
          if (canPersistVod) {
            writePersistentCache("local", apiPath, data, VOD_RESOLVE_TTL_MS);
          }
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
    this.getDetails(type, id).catch(() => {});
    this.resolveVodStreams(type, id)
      .then((res) => {
        if (res?.sources?.length) {
          prewarmStreamManifests(res.sources);
        }
      })
      .catch(() => {});
  },
};
