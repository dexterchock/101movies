import {
  getAllVodSites,
  parseVodPlayGroups,
  parseSeasonInfo,
  extractAudioLangFromText,
  toSimplifiedChinese,
} from "../../src/server/tvboxService";
import type {
  VodSite,
  ResolvedStreamSource,
  VodPlayGroup,
  VodEpisode,
} from "../../src/types";

// Re-export everything from the original tvboxService
export * from "../../src/server/tvboxService";

// In-memory cache for stream availability
const availabilityCache = new Map<
  string,
  { available: boolean; primaryZhTitle?: string; expiresAt: number }
>();

function stripLanguageAndStatusTags(text: string): string {
  return text
    .replace(
      /(?:国粤双语|中文字幕|国语版|粤语版|国语|粤语|英语|韩语|日语|俄语|法语|西语|泰语|印地语|德语|意大利语|普通话|双语)/gi,
      ""
    )
    .replace(/(?:HD|BD|TC|TS|CAM|4K|1080P|720P|2160P|HDR|杜比|蓝光|抢先版|高清版|高清|清晰版|未删减版|完整版|加长版)/gi, "")
    .replace(/(?:完结|全集|更新至\d+集?|第\d+集|全\d+集|连载\d+)/gi, "")
    .trim();
}

function stripYearSuffix(text: string): string {
  return text.replace(/[\(\[\{（【](?:19|20)\d{2}[\)\]\}）】]/g, "").trim();
}

function normalizeTitleForComparison(title: string): string {
  return String(title || "")
    .toLowerCase()
    .replace(/[：:·・,，!！?？'’"“”()（）[\]【】\-_/\\]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function extractNumbers(str: string): number[] {
  const matches = str.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

function computeTitleMatchScore(
  vodName: string,
  vodSub: string,
  targetTitles: string[],
  mediaType?: "movie" | "tv"
): number {
  const cleanVod = stripLanguageAndStatusTags(
    toSimplifiedChinese(stripYearSuffix(vodName))
  );
  const { baseTitle: vodBaseTitle } =
    mediaType === "tv" ? parseSeasonInfo(vodName) : { baseTitle: cleanVod };

  const normVodName = normalizeTitleForComparison(vodBaseTitle);
  const normCleanVod = normalizeTitleForComparison(cleanVod);
  if (!normVodName) return 0;

  const normAliases = vodSub
    .split(/[\/|,，;；、]+/)
    .map((s) => {
      const cleaned = stripLanguageAndStatusTags(
        toSimplifiedChinese(stripYearSuffix(s))
      );
      const base = mediaType === "tv" ? parseSeasonInfo(s).baseTitle : cleaned;
      return normalizeTitleForComparison(base);
    })
    .filter(Boolean);

  const vodNumbers = extractNumbers(normVodName);
  let bestScore = 0;

  for (const rawTarget of targetTitles) {
    const normTarget = normalizeTitleForComparison(rawTarget);
    if (!normTarget) continue;

    const targetNumbers = extractNumbers(normTarget);
    if (vodNumbers.length > 0 || targetNumbers.length > 0) {
      const vodNumStr = vodNumbers.join(",");
      const targetNumStr = targetNumbers.join(",");
      if (vodNumStr !== targetNumStr) continue;
    }

    if (normVodName === normTarget) return 200;
    if (normCleanVod === normTarget) return 195;

    for (const alias of normAliases) {
      if (alias === normTarget) return 190;
    }

    if (normVodName.includes(normTarget)) {
      const extraLen = normVodName.length - normTarget.length;
      if (extraLen <= 4) bestScore = Math.max(bestScore, 175);
      else if (extraLen <= 10) bestScore = Math.max(bestScore, 155);
      else bestScore = Math.max(bestScore, 140);
    } else if (normTarget.includes(normVodName)) {
      if (normVodName.length >= 2) bestScore = Math.max(bestScore, 145);
    }

    for (const alias of normAliases) {
      if (alias.includes(normTarget) && alias.length - normTarget.length <= 4) {
        bestScore = Math.max(bestScore, 160);
      }
    }
  }

  return bestScore;
}

// Top curated VOD providers for fast availability checks ordered by coverage and speed
const FAST_PROBE_SITES: { id: string; url: string }[] = [
  { id: "bfzy", url: "https://bfzyapi.com/api.php/provide/vod" },
  { id: "hhzy", url: "https://hhzyapi.com/api.php/provide/vod" },
  { id: "jisu", url: "https://jszyapi.com/api.php/provide/vod" },
];

async function probeVodSiteForMedia(
  siteUrl: string,
  keyword: string,
  targetTitles: string[],
  targetYear?: string,
  mediaType: "movie" | "tv" = "movie",
  timeoutMs = 2200
): Promise<boolean> {
  const sep = siteUrl.includes("?") ? "&" : "?";
  const searchUrl = `${siteUrl}${sep}ac=videolist&wd=${encodeURIComponent(keyword)}`;

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
      const { bestEpisodes } = parseVodPlayGroups(
        item.vod_play_from,
        item.vod_play_url
      );
      if (bestEpisodes.length === 0) continue;

      const vodName = String(item.vod_name || "").trim();
      const vodSub = String(item.vod_sub || "").trim();
      const vodRemarks = String(item.vod_remarks || "").trim();
      const vodYearMatch = String(item.vod_year || "").match(/(19|20)\d{2}/);
      const vodYear = vodYearMatch ? vodYearMatch[0] : "";

      if (
        vodName.includes("解说") ||
        vodName.includes("预告") ||
        vodName.includes("短剧") ||
        vodRemarks.includes("预告")
      ) {
        continue;
      }

      const hasNonTrailerEpisode = bestEpisodes.some(
        (ep) => !ep.name.includes("预告") && !ep.name.includes("花絮")
      );
      if (!hasNonTrailerEpisode) continue;

      const titleScore = computeTitleMatchScore(
        vodName,
        vodSub,
        targetTitles,
        mediaType
      );
      if (titleScore < 140) continue;

      // Year verification if available
      if (targetYear && vodYear) {
        const targetY = Number(targetYear);
        const vodY = Number(vodYear);
        const yearDiff = Math.abs(vodY - targetY);
        if (mediaType === "movie" && yearDiff > 2) continue;
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

  const tracker = budgetTracker || { used: 0, max: 44 };

  if (!primaryZhTitle && _tmdbApiKey && tracker.used < tracker.max - 2) {
    tracker.used++;
    try {
      const metaRes = await fetch(
        `https://api.themoviedb.org/3/${type}/${tmdbId}?language=zh-CN&api_key=${_tmdbApiKey}`,
        { signal: AbortSignal.timeout(2000) }
      );
      if (metaRes.ok) {
        const metaData: any = await metaRes.json();
        const zh = metaData.title || metaData.name;
        if (zh && /[\u4e00-\u9fff]/.test(zh)) {
          primaryZhTitle = toSimplifiedChinese(String(zh).trim());
        }
      }
    } catch {}
  }

  const candidateTitles: string[] = [];
  const addTitle = (t?: string) => {
    if (!t) return;
    const clean = toSimplifiedChinese(stripYearSuffix(t)).trim();
    if (clean && !candidateTitles.includes(clean)) candidateTitles.push(clean);
  };

  if (primaryZhTitle) {
    addTitle(primaryZhTitle);
    const beforeColon = primaryZhTitle.split(/[:：\s]/)[0].trim();
    if (beforeColon && beforeColon !== primaryZhTitle) {
      addTitle(beforeColon);
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

  // Search keyword: prefer clean Chinese title, then fallback to title
  const cleanZh = primaryZhTitle ? primaryZhTitle.split(/[:：\s]/)[0].trim() : "";
  const primaryQuery = cleanZh || item.title || item.name || candidateTitles[0];

  let available = false;

  for (const site of FAST_PROBE_SITES) {
    if (tracker.used >= tracker.max) break;
    tracker.used++;
    const found = await probeVodSiteForMedia(
      site.url,
      primaryQuery,
      candidateTitles,
      releaseYear,
      type
    );
    if (found) {
      available = true;
      break;
    }
  }

  const ttl = available ? 30 * 60 * 1000 : 15 * 60 * 1000;
  availabilityCache.set(availKey, {
    available,
    primaryZhTitle,
    expiresAt: Date.now() + ttl,
  });

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
  // Strict Cloudflare subrequest budget: max 44 out of 50 to guarantee zero subrequest errors
  const budgetTracker = { used: 0, max: 44 };
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= items.length) break;
        const item = items[idx];

        if (budgetTracker.used >= budgetTracker.max) {
          const cached = availabilityCache.get(
            `${item.media_type || defaultType}:${item.id}`
          );
          if (cached?.available) {
            results[idx] =
              item.is_chinese_origin && cached.primaryZhTitle
                ? {
                    ...item,
                    title: item.title !== undefined ? cached.primaryZhTitle : undefined,
                    name: item.name !== undefined ? cached.primaryZhTitle : undefined,
                    zh_title: cached.primaryZhTitle,
                  }
                : item;
          }
          continue;
        }

        const { available, primaryZhTitle } = await checkMediaHasPlayableStreams(
          item,
          defaultType,
          tmdbApiKey,
          budgetTracker
        );

        if (available) {
          results[idx] =
            item.is_chinese_origin && primaryZhTitle
              ? {
                  ...item,
                  title: item.title !== undefined ? primaryZhTitle : undefined,
                  name: item.name !== undefined ? primaryZhTitle : undefined,
                  zh_title: primaryZhTitle,
                }
              : item;
        }
      }
    }
  );

  await Promise.all(workers);
  return results.filter(Boolean);
}
