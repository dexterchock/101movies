import {
  filterItemsByServerAvailability,
  toSimplifiedChinese,
} from "./tvboxService";

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export function getTmdbKey(env?: Record<string, any>): string {
  if (env && typeof env.TMDB_API_KEY === "string" && env.TMDB_API_KEY.trim()) {
    return env.TMDB_API_KEY.trim();
  }
  if (typeof process !== "undefined" && process.env?.TMDB_API_KEY) {
    return process.env.TMDB_API_KEY.trim();
  }
  return "";
}

const CHINESE_LANGS = new Set(["zh", "cn", "yue", "bo", "za"]);
const CHINESE_COUNTRIES = new Set(["CN", "HK", "TW", "MO"]);

export function hasChineseChars(str: string): boolean {
  return /[\u4e00-\u9fff]/.test(str);
}

export function isChineseOriginItem(item: any): boolean {
  if (!item) return false;
  const origLang = String(item.original_language || "").toLowerCase().trim();
  if (CHINESE_LANGS.has(origLang)) return true;

  if (Array.isArray(item.origin_country)) {
    if (
      item.origin_country.some((c: any) =>
        CHINESE_COUNTRIES.has(String(c || "").toUpperCase().trim())
      )
    ) {
      return true;
    }
  }

  if (Array.isArray(item.production_countries)) {
    if (
      item.production_countries.some((c: any) =>
        CHINESE_COUNTRIES.has(String(c?.iso_3166_1 || "").toUpperCase().trim())
      )
    ) {
      return true;
    }
  }

  const origText = String(item.original_title || item.original_name || "").trim();
  if (hasChineseChars(origText) && (origLang === "zh" || origLang === "cn" || origLang === "yue")) {
    return true;
  }

  return false;
}

export function normalizeMediaItemTitles(item: any): any {
  if (!item || typeof item !== "object") return item;
  const isZhOrigin = isChineseOriginItem(item);
  const enTitle = String(item.title || item.name || "").trim();
  const rawOrigTitle = String(item.original_title || item.original_name || "").trim();
  const existingZh = item.zh_title;

  if (isZhOrigin && hasChineseChars(rawOrigTitle)) {
    const simpTitle = toSimplifiedChinese(rawOrigTitle);
    return {
      ...item,
      title: item.title !== undefined ? simpTitle : undefined,
      name: item.name !== undefined ? simpTitle : undefined,
      en_title: enTitle && enTitle !== simpTitle ? enTitle : undefined,
      zh_title: simpTitle,
      is_chinese_origin: true,
    };
  }

  return {
    ...item,
    en_title: enTitle || undefined,
    zh_title: existingZh,
    is_chinese_origin: isZhOrigin,
  };
}

export function filterReleasedMedia(items: any[], minVotes = 3): any[] {
  if (!Array.isArray(items)) return [];
  const todayIso = new Date().toISOString().slice(0, 10);
  return items
    .filter((item: any) => {
      if (!item || !item.poster_path) return false;
      const dateStr = item.release_date || item.first_air_date;
      if (!dateStr || typeof dateStr !== "string") return false;
      if (dateStr > todayIso) return false;
      const voteCount = Number(item.vote_count || 0);
      const voteAvg = Number(item.vote_average || 0);
      if (voteCount < minVotes || voteAvg <= 0) return false;
      return true;
    })
    .map(normalizeMediaItemTitles);
}

export const tmdbListCache = new Map<string, { results: any[]; expiresAt: number }>();

export async function fetchTmdb(
  endpoint: string,
  defaultType: "movie" | "tv",
  apiKey: string,
  minVotes = 3
): Promise<{ page: number; results: any[] }> {
  if (!apiKey) {
    console.warn("TMDB API Key not configured.");
    return { page: 1, results: [] };
  }
  const cached = tmdbListCache.get(endpoint);
  if (cached && cached.expiresAt > Date.now()) {
    return { page: 1, results: cached.results };
  }

  const separator = endpoint.includes("?") ? "&" : "?";
  const urlPage1 = `${TMDB_BASE_URL}${endpoint}${separator}page=1&api_key=${apiKey}`;
  const urlPage2 = `${TMDB_BASE_URL}${endpoint}${separator}page=2&api_key=${apiKey}`;
  const urlPage1Zh = `${TMDB_BASE_URL}${endpoint}${separator}page=1&language=zh-CN&api_key=${apiKey}`;
  const urlPage2Zh = `${TMDB_BASE_URL}${endpoint}${separator}page=2&language=zh-CN&api_key=${apiKey}`;

  const [res1, res2, zhRes1, zhRes2] = await Promise.allSettled<any>([
    fetch(urlPage1).then((r) => r.json()),
    fetch(urlPage2).then((r) => r.json()),
    fetch(urlPage1Zh).then((r) => r.json()),
    fetch(urlPage2Zh).then((r) => r.json()),
  ]);

  const zhMap = new Map<number, string>();
  for (const settled of [zhRes1, zhRes2]) {
    if (settled.status === "fulfilled" && Array.isArray((settled.value as any)?.results)) {
      for (const item of (settled.value as any).results) {
        if (item && typeof item.id === "number") {
          const t = item.title || item.name;
          if (t && hasChineseChars(t)) {
            zhMap.set(item.id, toSimplifiedChinese(t.trim()));
          }
        }
      }
    }
  }

  const rawCombined: any[] = [];
  const seenIds = new Set<number>();
  for (const settled of [res1, res2]) {
    if (settled.status === "fulfilled" && Array.isArray((settled.value as any)?.results)) {
      for (const item of (settled.value as any).results) {
        if (item && typeof item.id === "number" && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          const zhTitle = zhMap.get(item.id);
          rawCombined.push({
            ...item,
            media_type: item.media_type || defaultType,
            zh_title: zhTitle || item.zh_title,
          });
        }
      }
    }
  }

  const releasedCandidates = filterReleasedMedia(rawCombined, minVotes).slice(0, 28);
  const verifiedResults = await filterItemsByServerAvailability(
    releasedCandidates,
    defaultType,
    apiKey
  );

  tmdbListCache.set(endpoint, {
    results: verifiedResults,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  return { page: 1, results: verifiedResults };
}

export async function fetchMediaDetails(
  type: "movie" | "tv",
  id: string,
  apiKey: string
): Promise<any> {
  if (!apiKey) {
    console.warn("TMDB API Key not configured.");
    return {};
  }

  const [enRes, zhRes] = await Promise.allSettled<any>([
    fetch(
      `${TMDB_BASE_URL}/${type}/${id}?language=en-US&append_to_response=credits&api_key=${apiKey}`
    ).then((r) => r.json()),
    fetch(
      `${TMDB_BASE_URL}/${type}/${id}?language=zh-CN&append_to_response=translations,alternative_titles&api_key=${apiKey}`
    ).then((r) => r.json()),
  ]);

  const enData: any = enRes.status === "fulfilled" && enRes.value ? enRes.value : {};
  const zhData: any = zhRes.status === "fulfilled" && zhRes.value ? zhRes.value : {};

  let rawZhTitle = "";

  const zhPrimary = (zhData.title || zhData.name || "").trim();
  const origPrimary = (enData.original_title || enData.original_name || "").trim();

  if (hasChineseChars(zhPrimary)) {
    rawZhTitle = zhPrimary;
  } else if (hasChineseChars(origPrimary)) {
    rawZhTitle = origPrimary;
  } else {
    const transList = Array.isArray(zhData?.translations?.translations)
      ? zhData.translations.translations
      : [];
    for (const region of ["CN", "SG", "TW", "HK"]) {
      const found = transList.find(
        (tr: any) =>
          tr?.iso_639_1 === "zh" &&
          tr?.iso_3166_1 === region &&
          hasChineseChars(String(tr?.data?.title || tr?.data?.name || ""))
      );
      if (found) {
        rawZhTitle = String(found.data.title || found.data.name).trim();
        break;
      }
    }
    if (!rawZhTitle) {
      const altList = Array.isArray(zhData?.alternative_titles?.results)
        ? zhData.alternative_titles.results
        : Array.isArray(zhData?.alternative_titles?.titles)
        ? zhData.alternative_titles.titles
        : [];
      const foundAlt = altList.find((a: any) =>
        hasChineseChars(String(a?.title || a?.name || ""))
      );
      if (foundAlt) {
        rawZhTitle = String(foundAlt.title || foundAlt.name).trim();
      }
    }
  }

  const zh_title = rawZhTitle ? toSimplifiedChinese(rawZhTitle) : undefined;
  const en_title = String(enData.title || enData.name || "").trim() || undefined;
  const is_chinese_origin = isChineseOriginItem(enData);

  const cast: string[] = Array.isArray(enData?.credits?.cast)
    ? enData.credits.cast
        .slice(0, 5)
        .map((c: any) => String(c?.name || "").trim())
        .filter(Boolean)
    : [];

  const primaryDisplayTitle =
    is_chinese_origin && zh_title ? zh_title : en_title || zh_title || "";

  return {
    ...enData,
    title: type === "movie" ? primaryDisplayTitle : enData.title,
    name: type === "tv" ? primaryDisplayTitle : enData.name,
    en_title,
    zh_title,
    is_chinese_origin,
    cast,
  };
}

export function resolveTmdbGenre(type: "movie" | "tv", genre?: string): string {
  if (!genre || genre === "all") return "";
  const g = genre.toLowerCase().trim();
  switch (g) {
    case "action":
    case "28":
    case "10759":
      return type === "tv" ? "10759" : "28";
    case "scifi":
    case "sci-fi":
    case "878":
    case "10765":
      return type === "tv" ? "10765" : "878";
    case "comedy":
    case "35":
      return "35";
    case "drama":
    case "18":
      return "18";
    case "animation":
    case "16":
      return "16";
    case "thriller":
    case "53":
      return type === "tv" ? "80,9648" : "53";
    case "crime":
    case "80":
      return "80";
    case "mystery":
    case "9648":
      return "9648";
    case "horror":
    case "27":
      return type === "tv" ? "9648" : "27";
    case "romance":
    case "10749":
      return type === "tv" ? "18" : "10749";
    case "adventure":
    case "12":
      return type === "tv" ? "10759" : "12";
    default:
      return genre;
  }
}
