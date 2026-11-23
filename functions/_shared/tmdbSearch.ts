import {
  TMDB_BASE_URL,
  filterReleasedMedia,
  getTmdbKey,
} from "./tmdb";
import {
  filterItemsByServerAvailability,
  parseSeasonInfo,
  resolveFallbackParentTitlesFromVod,
  toSimplifiedChinese,
} from "./tvboxService";

export function computeSearchRelevance(
  item: any,
  query: string,
  cleanQuery: string
): number {
  const titles = [
    item.title,
    item.name,
    item.zh_title,
    item.original_title,
    item.original_name,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim());

  const q = query.toLowerCase().trim();
  const cleanQ = cleanQuery.toLowerCase().trim();
  const normQ = q.replace(/[:：\s\-_]/g, "");
  const normCleanQ = cleanQ.replace(/[:：\s\-_]/g, "");

  let score = 0;

  const hasExactTitle = titles.some((t) => {
    const normT = t.replace(/[:：\s\-_]/g, "");
    return normT === normQ || normT === normCleanQ;
  });

  const startsWithQuery = titles.some((t) => {
    const normT = t.replace(/[:：\s\-_]/g, "");
    return normT.startsWith(normQ) || (normCleanQ && normT.startsWith(normCleanQ));
  });

  const containsQuery = titles.some((t) => {
    const normT = t.replace(/[:：\s\-_]/g, "");
    return normT.includes(normQ) || (normCleanQ && normT.includes(normCleanQ));
  });

  if (hasExactTitle) {
    score += 2000;
  } else if (startsWithQuery) {
    score += 1000;
  } else if (containsQuery) {
    score += 600;
  } else if (item.fromZhSearch) {
    score += 350;
  } else if (typeof item.overview === "string" && item.overview) {
    const overviewLower = item.overview.toLowerCase();
    if (overviewLower.includes(q) || (cleanQ && overviewLower.includes(cleanQ))) {
      score += 150;
    }
  }

  score += Math.min(Number(item.popularity) || 0, 200) * 1.5;
  score += Math.min(Number(item.vote_count) || 0, 10000) * 0.03;

  const year = Number((item.release_date || item.first_air_date || "").slice(0, 4));
  if (year >= 2000) {
    score += 50;
  }

  return score;
}

async function fetchAndScoreTmdbCandidates(
  fetchConfigs: { url: string; isZh: boolean }[],
  query: string,
  cleanQuery: string,
  isZhQuery: boolean
): Promise<any[]> {
  const responses = await Promise.allSettled<any>(
    fetchConfigs.map((cfg) =>
      fetch(cfg.url, { signal: AbortSignal.timeout(4500) }).then((r) => r.json())
    )
  );

  const zhMap = new Map<string, string>();
  const enMap = new Map<string, string>();
  const rawCandidateMap = new Map<string, any>();

  responses.forEach((res, i) => {
    if (res.status !== "fulfilled" || !Array.isArray(res.value?.results)) return;
    const isFromZhEndpoint = fetchConfigs[i].isZh;

    for (const item of res.value.results) {
      if (!item || typeof item.id !== "number") continue;
      if (item.media_type !== "movie" && item.media_type !== "tv") continue;

      const key = `${item.media_type}:${item.id}`;
      const t = item.title || item.name;
      if (t) {
        if (/[\u4e00-\u9fff]/.test(t)) {
          zhMap.set(key, toSimplifiedChinese(t.trim()));
        } else {
          enMap.set(key, t.trim());
        }
      }

      if (!rawCandidateMap.has(key)) {
        rawCandidateMap.set(key, {
          ...item,
          fromZhSearch: isFromZhEndpoint,
        });
      } else if (isFromZhEndpoint) {
        rawCandidateMap.get(key).fromZhSearch = true;
      }
    }
  });

  const rawResults: any[] = [];
  for (const item of rawCandidateMap.values()) {
    const key = `${item.media_type}:${item.id}`;
    const zhTitle =
      zhMap.get(key) ||
      (isZhQuery && /[\u4e00-\u9fff]/.test(item.title || item.name)
        ? toSimplifiedChinese(item.title || item.name)
        : undefined);
    const enTitle =
      enMap.get(key) ||
      item.original_title ||
      item.original_name ||
      item.title ||
      item.name;

    rawResults.push({
      ...item,
      title: item.title !== undefined ? enTitle || item.title : undefined,
      name: item.name !== undefined ? enTitle || item.name : undefined,
      zh_title: zhTitle,
    });
  }

  rawResults.sort(
    (a, b) =>
      computeSearchRelevance(b, query, cleanQuery) -
      computeSearchRelevance(a, query, cleanQuery)
  );

  return rawResults;
}

export async function searchTmdbWithVodAvailability(
  query: string,
  apiKey: string
): Promise<any[]> {
  if (!query || !apiKey) return [];

  const isZhQuery = /[\u4e00-\u9fff]/.test(query);
  const cleanQuery = query.replace(/[:：]+$/, "").trim();
  const compactQuery = query.replace(/[:：\s]+/g, "").trim();

  const fetchConfigs: { url: string; isZh: boolean }[] = [
    {
      url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=1&api_key=${apiKey}`,
      isZh: false,
    },
    {
      url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=2&api_key=${apiKey}`,
      isZh: false,
    },
    {
      url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=1&language=zh-CN&api_key=${apiKey}`,
      isZh: true,
    },
    {
      url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=2&language=zh-CN&api_key=${apiKey}`,
      isZh: true,
    },
  ];

  if (isZhQuery) {
    fetchConfigs.push({
      url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=3&language=zh-CN&api_key=${apiKey}`,
      isZh: true,
    });
  }

  if (cleanQuery && cleanQuery !== query) {
    fetchConfigs.push(
      {
        url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(cleanQuery)}&page=1&api_key=${apiKey}`,
        isZh: false,
      },
      {
        url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(cleanQuery)}&page=1&language=zh-CN&api_key=${apiKey}`,
        isZh: true,
      }
    );
  }

  if (compactQuery && compactQuery !== query && compactQuery !== cleanQuery) {
    fetchConfigs.push({
      url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(compactQuery)}&page=1&language=zh-CN&api_key=${apiKey}`,
      isZh: true,
    });
  }

  const seasonBaseQuery = parseSeasonInfo(query).baseTitle;
  if (
    seasonBaseQuery &&
    seasonBaseQuery.length >= 2 &&
    seasonBaseQuery !== query &&
    seasonBaseQuery !== cleanQuery &&
    seasonBaseQuery !== compactQuery
  ) {
    const seasonIsZh = /[\u4e00-\u9fff]/.test(seasonBaseQuery);
    fetchConfigs.push({
      url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(seasonBaseQuery)}${
        seasonIsZh ? "&language=zh-CN" : ""
      }&page=1&api_key=${apiKey}`,
      isZh: seasonIsZh,
    });
  }

  const rawResults = await fetchAndScoreTmdbCandidates(
    fetchConfigs,
    query,
    cleanQuery,
    isZhQuery
  );

  const releasedCandidates = filterReleasedMedia(rawResults, 1).slice(0, 26);
  let verified = await filterItemsByServerAvailability(
    releasedCandidates,
    "movie",
    apiKey
  );

  if (verified.length === 0 && releasedCandidates.length <= 10) {
    const fallbackTitles = await resolveFallbackParentTitlesFromVod(query);
    if (fallbackTitles.length > 0) {
      const primaryFallback = fallbackTitles[0];
      const fallbackConfigs = fallbackTitles.slice(0, 1).flatMap((ft) => [
        {
          url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(ft)}&page=1&api_key=${apiKey}`,
          isZh: false,
        },
        {
          url: `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(ft)}&page=1&language=zh-CN&api_key=${apiKey}`,
          isZh: true,
        },
      ]);
      const fallbackRaw = await fetchAndScoreTmdbCandidates(
        fallbackConfigs,
        primaryFallback,
        primaryFallback,
        true
      );
      const fallbackReleased = filterReleasedMedia(fallbackRaw, 1).slice(0, 6);
      if (fallbackReleased.length > 0) {
        verified = await filterItemsByServerAvailability(
          fallbackReleased,
          "movie",
          apiKey
        );
      }
    }
  }

  return verified;
}

export { getTmdbKey };
