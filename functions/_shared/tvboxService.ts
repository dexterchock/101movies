import {
  computeTitleMatchScore,
  generateZhTitleVariants,
  setBoundedCache,
  stripYearSuffix,
  toSimplifiedChinese,
} from "../../src/server/tvboxService";

// Re-export everything from the original tvboxService
export * from "../../src/server/tvboxService";

// In-memory cache for stream availability (bounded)
const availabilityCache = new Map<
  string,
  { available: boolean; primaryZhTitle?: string; expiresAt: number }
>();

// Top curated VOD providers for fast availability checks ordered by coverage and low latency
const FAST_PROBE_SITES: { id: string; url: string }[] = [
  { id: "bfzy", url: "https://bfzyapi.com/api.php/provide/vod" },
  { id: "hhzy", url: "https://hhzyapi.com/api.php/provide/vod" },
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
  targetTitles: string[],
  targetYear?: string,
  mediaType: "movie" | "tv" = "movie",
  useVideoList = true,
  timeoutMs = 2200
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

export async function checkMediaHasPlayableStreams(
  item: any,
  defaultType: "movie" | "tv",
  _tmdbApiKey?: string,
  budgetTracker?: { used: number; max: number }
): Promise<{ available: boolean; primaryZhTitle?: string }> {
  if (!item || !item.id) return { available: false };
  const type: "movie" | "tv" =
    item.media_type === "tv" || defaultType === "tv" ? "tv" : "movie";
  const tmdbId = String(item.id);
  const availKey = `${type}:${tmdbId}`;

  const cached = availabilityCache.get(availKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      available: cached.available,
      primaryZhTitle: cached.primaryZhTitle,
    };
  }

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
  if (!primaryZhTitle && _tmdbApiKey && tracker.used < tracker.max - 2 && consumeBudget(tracker)) {
    try {
      const metaRes = await fetch(
        `https://api.themoviedb.org/3/${type}/${tmdbId}?language=zh-CN&append_to_response=translations,alternative_titles&api_key=${_tmdbApiKey}`,
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

  if (candidateTitles.length === 0) {
    return { available: false, primaryZhTitle };
  }

  const releaseYear = (item.release_date || item.first_air_date || "").slice(0, 4);
  const cleanZh = primaryZhTitle ? primaryZhTitle.split(/[:：\s]/)[0].trim() : "";
  const primaryQuery = probeQuery || cleanZh || item.title || item.name || candidateTitles[0];

  let available = false;
  let checkedAtLeastOneSite = false;

  for (const site of FAST_PROBE_SITES) {
    if (!consumeBudget(tracker)) break;
    checkedAtLeastOneSite = true;
    const found = await probeVodSiteForMedia(
      site.url,
      primaryQuery,
      candidateTitles,
      releaseYear,
      type,
      true
    );
    if (found) {
      available = true;
      break;
    }
  }

  if (available || checkedAtLeastOneSite) {
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

  return { available, primaryZhTitle };
}

export async function filterItemsByServerAvailability(
  items: any[],
  defaultType: "movie" | "tv",
  tmdbApiKey?: string,
  concurrency = 6
): Promise<any[]> {
  if (!Array.isArray(items) || items.length === 0) return [];

  const results: (any | null)[] = new Array(items.length).fill(null);
  // Strict Cloudflare subrequest budget: max 32 out of 50 (reserving room for TMDB & redirects)
  const budgetTracker = { used: 0, max: 32 };
  const maxAvailableItems = 20;
  let availableCount = 0;
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        if (availableCount >= maxAvailableItems) break;
        const idx = cursor++;
        if (idx >= items.length) break;
        const item = items[idx];

        const cached = availabilityCache.get(
          `${item.media_type || defaultType}:${item.id}`
        );
        if (cached && cached.expiresAt > Date.now()) {
          if (cached.available) {
            availableCount++;
            results[idx] = {
              ...item,
              title:
                item.is_chinese_origin && cached.primaryZhTitle
                  ? cached.primaryZhTitle
                  : item.title,
              name:
                item.is_chinese_origin && cached.primaryZhTitle
                  ? cached.primaryZhTitle
                  : item.name,
              zh_title: cached.primaryZhTitle || item.zh_title,
            };
          }
          continue;
        }

        if (budgetTracker.used >= budgetTracker.max) {
          continue;
        }

        const { available, primaryZhTitle } = await checkMediaHasPlayableStreams(
          item,
          defaultType,
          tmdbApiKey,
          budgetTracker
        );

        if (available) {
          availableCount++;
          results[idx] = {
            ...item,
            title:
              item.is_chinese_origin && primaryZhTitle
                ? primaryZhTitle
                : item.title,
            name:
              item.is_chinese_origin && primaryZhTitle
                ? primaryZhTitle
                : item.name,
            zh_title: primaryZhTitle || item.zh_title,
          };
        }
      }
    }
  );

  await Promise.all(workers);
  return results.filter(Boolean).slice(0, maxAvailableItems);
}
