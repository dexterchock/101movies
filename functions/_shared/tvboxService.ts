import {
  computeTitleMatchScore,
  generateZhTitleVariants,
  prepareTargetTitles,
  setBoundedCache,
  stripYearSuffix,
  toSimplifiedChinese,
  type PreparedTargetTitle,
} from "../../src/server/tvboxService";

// Re-export everything from the original tvboxService
export * from "../../src/server/tvboxService";

// In-memory cache for stream availability (bounded)
const availabilityCache = new Map<
  string,
  { available: boolean; primaryZhTitle?: string; expiresAt: number }
>();

// Top curated VOD providers for fast availability checks ordered by coverage and playability.
// NOTE: Keep limited to 2 large-catalog sites with verified working video CDNs (see AGENTS.md).
const FAST_PROBE_SITES: { id: string; url: string }[] = [
  { id: "bfzy", url: "https://bfzyapi.com/api.php/provide/vod" },
  { id: "lzzy", url: "https://cj.lziapi.com/api.php/provide/vod" },
];

function consumeBudget(tracker: { used: number; max: number }): boolean {
  if (tracker.used >= tracker.max) return false;
  tracker.used++;
  return true;
}

function hasPlayableStreamWithoutParsing(
  vodPlayFrom: unknown,
  vodPlayUrl: unknown
): boolean {
  const fromStr = String(vodPlayFrom || "").trim();
  const urlStr = String(vodPlayUrl || "").trim();
  if (!fromStr && !urlStr) return false;
  if (!urlStr) return fromStr.length > 0;

  // Lightweight episode check without allocating play-group objects
  const groups = urlStr.split("$$$");
  for (let g = 0; g < groups.length; g++) {
    const items = groups[g].split("#");
    for (let i = 0; i < items.length; i++) {
      const part = items[i];
      if (!part) continue;
      const dollarIdx = part.indexOf("$");
      const epName = dollarIdx >= 0 ? part.slice(0, dollarIdx) : "";
      const epUrl = (dollarIdx >= 0 ? part.slice(dollarIdx + 1) : part).trim();
      if (!epUrl.startsWith("http")) continue;
      if (epName.includes("预告") || epName.includes("花絮")) continue;
      return true;
    }
  }
  return false;
}

async function probeVodSiteForMedia(
  siteUrl: string,
  keyword: string,
  targetTitles: string[] | PreparedTargetTitle[],
  targetYear?: string,
  mediaType: "movie" | "tv" = "movie",
  useVideoList = true,
  timeoutMs = 2000
): Promise<boolean> {
  const sep = siteUrl.includes("?") ? "&" : "?";
  const ac = useVideoList ? "videolist" : "list";
  const searchUrl = `${siteUrl}${sep}ac=${ac}&wd=${encodeURIComponent(keyword)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "okhttp/4.12.0",
        Accept: "application/json, text/plain, */*",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return false;
    const data: any = await res.json();
    const list = Array.isArray(data?.list) ? data.list : [];
    if (list.length === 0) return false;

    for (const item of list) {
      const vodName = String(item.vod_name || "").trim();
      const vodSub = String(item.vod_sub || "").trim();
      const vodRemarks = String(item.vod_remarks || "").trim();
      const vodPlayFrom = String(item.vod_play_from || "").trim();
      const vodYearMatch = String(item.vod_year || "").match(/(19|20)\d{2}/);
      const vodYear = vodYearMatch ? vodYearMatch[0] : "";

      if (
        !vodPlayFrom ||
        vodName.includes("解说") ||
        vodName.includes("预告") ||
        vodName.includes("短剧") ||
        vodRemarks.includes("预告") ||
        vodRemarks.includes("花絮") ||
        vodRemarks.includes("先导") ||
        vodRemarks.includes("电影解说")
      ) {
        continue;
      }

      const titleScore = computeTitleMatchScore(
        vodName,
        vodSub,
        targetTitles,
        mediaType
      );
      if (titleScore < 140) continue;

      if (targetYear && vodYear) {
        const targetY = Number(targetYear);
        const vodY = Number(vodYear);
        if (
          mediaType === "movie" &&
          Number.isFinite(targetY) &&
          Number.isFinite(vodY) &&
          targetY > 0 &&
          vodY > 0 &&
          Math.abs(vodY - targetY) > 2
        ) {
          continue;
        }
      }

      if (
        useVideoList &&
        !hasPlayableStreamWithoutParsing(item.vod_play_from, item.vod_play_url)
      ) {
        continue;
      }

      return true;
    }
  } catch {}
  return false;
}

interface ProbeContext {
  idx: number;
  item: any;
  type: "movie" | "tv";
  availKey: string;
  primaryZhTitle?: string;
  primaryQuery: string;
  preparedTargets: PreparedTargetTitle[];
  releaseYear: string;
}

function applyAvailabilityTitle(item: any, primaryZhTitle?: string): any {
  return {
    ...item,
    title:
      item.is_chinese_origin && primaryZhTitle ? primaryZhTitle : item.title,
    name:
      item.is_chinese_origin && primaryZhTitle ? primaryZhTitle : item.name,
    zh_title: primaryZhTitle || item.zh_title,
  };
}

function storeAvailabilityCache(
  availKey: string,
  available: boolean,
  primaryZhTitle?: string
): void {
  const ttl = available ? 30 * 60 * 1000 : 15 * 60 * 1000;
  setBoundedCache(
    availabilityCache,
    availKey,
    {
      available,
      primaryZhTitle,
      expiresAt: Date.now() + ttl,
    },
    500
  );
}

async function prepareProbeContext(
  idx: number,
  item: any,
  defaultType: "movie" | "tv",
  tmdbApiKey?: string,
  budgetTracker?: { used: number; max: number }
): Promise<ProbeContext | null> {
  if (!item || !item.id) return null;
  const type: "movie" | "tv" =
    item.media_type === "tv" || defaultType === "tv" ? "tv" : "movie";
  const tmdbId = String(item.id);
  const availKey = `${type}:${tmdbId}`;

  let primaryZhTitle =
    item.zh_title && /[\u4e00-\u9fff]/.test(item.zh_title)
      ? toSimplifiedChinese(item.zh_title.trim())
      : undefined;

  const tracker = budgetTracker || { used: 0, max: 30 };
  const candidateTitles: string[] = [];
  const addTitle = (t?: string) => {
    if (!t) return;
    const clean = toSimplifiedChinese(stripYearSuffix(t)).trim();
    if (clean && !candidateTitles.includes(clean)) candidateTitles.push(clean);
  };

  let probeQuery = "";

  // Only look up TMDB detail translations for the rare item lacking any CJK list title
  if (!primaryZhTitle && tmdbApiKey && tracker.used < tracker.max - 2 && consumeBudget(tracker)) {
    try {
      const metaRes = await fetch(
        `https://api.themoviedb.org/3/${type}/${tmdbId}?language=zh-CN&append_to_response=translations,alternative_titles&api_key=${tmdbApiKey}`,
        { signal: AbortSignal.timeout(2200) }
      );
      if (metaRes.ok) {
        const metaData: any = await metaRes.json();
        const allZhTitles = new Set<string>();

        const zh = metaData.title || metaData.name;
        if (zh && /[\u4e00-\u9fff]/.test(zh)) allZhTitles.add(zh.trim());

        if (Array.isArray(metaData?.translations?.translations)) {
          for (const region of ["CN", "SG", "TW", "HK"]) {
            for (const tr of metaData.translations.translations) {
              if (tr?.iso_639_1 === "zh" && tr?.iso_3166_1 === region) {
                const t = tr?.data?.title || tr?.data?.name;
                if (t && /[\u4e00-\u9fff]/.test(t)) {
                  allZhTitles.add(t.trim());
                }
              }
            }
          }
        }

        const altList = Array.isArray(metaData?.alternative_titles?.titles)
          ? metaData.alternative_titles.titles
          : Array.isArray(metaData?.alternative_titles?.results)
          ? metaData.alternative_titles.results
          : [];
        for (const alt of altList) {
          const t = alt.title || alt.name;
          if (t && /[\u4e00-\u9fff]/.test(t)) {
            allZhTitles.add(t.trim());
          }
        }

        for (const t of allZhTitles) {
          if (!primaryZhTitle) primaryZhTitle = toSimplifiedChinese(t);
          const { variants, probeKeyword } = generateZhTitleVariants(t);
          if (!probeQuery) probeQuery = probeKeyword;
          for (const v of variants) addTitle(v);
        }
      }
    } catch {}
  } else if (primaryZhTitle) {
    const { variants, probeKeyword } = generateZhTitleVariants(primaryZhTitle);
    probeQuery = probeKeyword;
    for (const v of variants) {
      addTitle(v);
    }
  }

  addTitle(item.title);
  addTitle(item.name);
  addTitle(item.original_title);
  addTitle(item.original_name);

  if (candidateTitles.length === 0) return null;

  const releaseYear = (item.release_date || item.first_air_date || "").slice(0, 4);
  const cleanZh = primaryZhTitle ? primaryZhTitle.split(/[:：\s]/)[0].trim() : "";
  const primaryQuery =
    probeQuery || cleanZh || item.title || item.name || candidateTitles[0];

  return {
    idx,
    item,
    type,
    availKey,
    primaryZhTitle,
    primaryQuery,
    preparedTargets: prepareTargetTitles(candidateTitles, type),
    releaseYear,
  };
}

export async function checkMediaHasPlayableStreams(
  item: any,
  defaultType: "movie" | "tv",
  tmdbApiKey?: string,
  budgetTracker?: { used: number; max: number }
): Promise<{ available: boolean; primaryZhTitle?: string }> {
  if (!item || !item.id) return { available: false };
  const type: "movie" | "tv" =
    item.media_type === "tv" || defaultType === "tv" ? "tv" : "movie";
  const availKey = `${type}:${String(item.id)}`;

  const cached = availabilityCache.get(availKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      available: cached.available,
      primaryZhTitle: cached.primaryZhTitle,
    };
  }

  const tracker = budgetTracker || { used: 0, max: 30 };
  const ctx = await prepareProbeContext(0, item, defaultType, tmdbApiKey, tracker);
  if (!ctx) {
    return { available: false };
  }

  let available = false;
  let checkedAtLeastOneSite = false;

  for (const site of FAST_PROBE_SITES) {
    if (!consumeBudget(tracker)) break;
    checkedAtLeastOneSite = true;
    const found = await probeVodSiteForMedia(
      site.url,
      ctx.primaryQuery,
      ctx.preparedTargets,
      ctx.releaseYear,
      ctx.type,
      true
    );
    if (found) {
      available = true;
      break;
    }
  }

  if (available || checkedAtLeastOneSite) {
    storeAvailabilityCache(ctx.availKey, available, ctx.primaryZhTitle);
  }

  return { available, primaryZhTitle: ctx.primaryZhTitle };
}

export async function filterItemsByServerAvailability(
  items: any[],
  defaultType: "movie" | "tv",
  tmdbApiKey?: string,
  concurrency = 12
): Promise<any[]> {
  if (!Array.isArray(items) || items.length === 0) return [];

  const results: (any | null)[] = new Array(items.length).fill(null);
  // Strict Cloudflare subrequest budget: max 32 out of 50 (reserving room for TMDB & redirects)
  const budgetTracker = { used: 0, max: 32 };
  const maxAvailableItems = 20;
  let availableCount = 0;

  const now = Date.now();
  const uncachedItems: { idx: number; item: any }[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (!item || !item.id) continue;
    const type: "movie" | "tv" =
      item.media_type === "tv" || defaultType === "tv" ? "tv" : "movie";
    const cached = availabilityCache.get(`${type}:${item.id}`);
    if (cached && cached.expiresAt > now) {
      if (cached.available && availableCount < maxAvailableItems) {
        availableCount++;
        results[idx] = applyAvailabilityTitle(item, cached.primaryZhTitle);
      }
      continue;
    }
    uncachedItems.push({ idx, item });
  }

  if (availableCount >= maxAvailableItems || uncachedItems.length === 0) {
    return results.filter(Boolean).slice(0, maxAvailableItems);
  }

  const contextPoolSize = Math.min(8, uncachedItems.length);
  const preparedContexts: ProbeContext[] = [];
  let ctxCursor = 0;
  await Promise.all(
    Array.from({ length: contextPoolSize }, async () => {
      while (true) {
        const pos = ctxCursor++;
        if (pos >= uncachedItems.length) break;
        const { idx, item } = uncachedItems[pos];
        const ctx = await prepareProbeContext(
          idx,
          item,
          defaultType,
          tmdbApiKey,
          budgetTracker
        );
        if (ctx) preparedContexts.push(ctx);
      }
    })
  );

  preparedContexts.sort((a, b) => a.idx - b.idx);
  const pass1Site = FAST_PROBE_SITES[0];
  const pass2Site = FAST_PROBE_SITES[1];
  const pass1Misses: ProbeContext[] = [];

  // Pass 1: Probe primary high-coverage site (bfzy) in parallel across uncached items
  if (pass1Site && preparedContexts.length > 0 && availableCount < maxAvailableItems) {
    let pass1Cursor = 0;
    const workers = Array.from(
      { length: Math.min(concurrency, preparedContexts.length) },
      async () => {
        while (true) {
          if (availableCount >= maxAvailableItems) break;
          const pos = pass1Cursor++;
          if (pos >= preparedContexts.length) break;
          const ctx = preparedContexts[pos];
          if (!consumeBudget(budgetTracker)) break;

          const found = await probeVodSiteForMedia(
            pass1Site.url,
            ctx.primaryQuery,
            ctx.preparedTargets,
            ctx.releaseYear,
            ctx.type,
            true
          );
          if (found) {
            availableCount++;
            results[ctx.idx] = applyAvailabilityTitle(ctx.item, ctx.primaryZhTitle);
            storeAvailabilityCache(ctx.availKey, true, ctx.primaryZhTitle);
          } else {
            pass1Misses.push(ctx);
          }
        }
      }
    );
    await Promise.all(workers);
  }

  // Pass 2: Probe backup high-coverage site (lzzy) in parallel ONLY for Pass 1 misses
  if (
    pass2Site &&
    pass1Misses.length > 0 &&
    availableCount < maxAvailableItems &&
    budgetTracker.used < budgetTracker.max
  ) {
    pass1Misses.sort((a, b) => a.idx - b.idx);
    let pass2Cursor = 0;
    const workers = Array.from(
      { length: Math.min(concurrency, pass1Misses.length) },
      async () => {
        while (true) {
          if (availableCount >= maxAvailableItems) break;
          const pos = pass2Cursor++;
          if (pos >= pass1Misses.length) break;
          const ctx = pass1Misses[pos];
          if (!consumeBudget(budgetTracker)) break;

          const found = await probeVodSiteForMedia(
            pass2Site.url,
            ctx.primaryQuery,
            ctx.preparedTargets,
            ctx.releaseYear,
            ctx.type,
            true
          );
          if (found) {
            availableCount++;
            results[ctx.idx] = applyAvailabilityTitle(ctx.item, ctx.primaryZhTitle);
            storeAvailabilityCache(ctx.availKey, true, ctx.primaryZhTitle);
          } else {
            storeAvailabilityCache(ctx.availKey, false, ctx.primaryZhTitle);
          }
        }
      }
    );
    await Promise.all(workers);
  }

  return results.filter(Boolean).slice(0, maxAvailableItems);
}
