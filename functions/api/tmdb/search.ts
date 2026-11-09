import {
  TMDB_BASE_URL,
  filterReleasedMedia,
  getTmdbKey,
} from "../../_shared/tmdb";
import { filterItemsByServerAvailability } from "../../_shared/tvboxService";

function computeSearchRelevance(item: any, query: string, cleanQuery: string): number {
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
    score += 1000;
  } else if (startsWithQuery) {
    score += 600;
  } else if (containsQuery) {
    score += 400;
  } else if (item.fromZhSearch) {
    score += 450;
  } else if (
    item.overview &&
    (item.overview.includes(q) || (cleanQ && item.overview.includes(cleanQ)))
  ) {
    score += 150;
  }

  score += (Number(item.popularity) || 0) * 1.5;
  score += Math.min(Number(item.vote_count) || 0, 10000) * 0.05;

  const year = Number((item.release_date || item.first_air_date || "").slice(0, 4));
  if (year >= 2000) {
    score += 50;
  }

  return score;
}

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const query = url.searchParams.get("q")?.trim() || "";
  const apiKey = getTmdbKey(context.env);

  if (!query || !apiKey) {
    return Response.json({ results: [] });
  }

  try {
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

    const responses = await Promise.allSettled<any>(
      fetchConfigs.map((cfg) => fetch(cfg.url).then((r) => r.json()))
    );

    const zhMap = new Map<number, string>();
    const enMap = new Map<number, string>();
    const rawCandidateMap = new Map<number, any>();

    responses.forEach((res, i) => {
      if (res.status !== "fulfilled" || !Array.isArray(res.value?.results)) return;
      const isFromZhEndpoint = fetchConfigs[i].isZh;

      for (const item of res.value.results) {
        if (!item || typeof item.id !== "number") continue;
        if (item.media_type !== "movie" && item.media_type !== "tv") continue;

        const t = item.title || item.name;
        if (t) {
          if (/[\u4e00-\u9fff]/.test(t)) {
            zhMap.set(item.id, t.trim());
          } else {
            enMap.set(item.id, t.trim());
          }
        }

        if (!rawCandidateMap.has(item.id)) {
          rawCandidateMap.set(item.id, {
            ...item,
            fromZhSearch: isFromZhEndpoint,
          });
        } else if (isFromZhEndpoint) {
          rawCandidateMap.get(item.id).fromZhSearch = true;
        }
      }
    });

    const rawResults: any[] = [];
    for (const item of rawCandidateMap.values()) {
      const zhTitle =
        zhMap.get(item.id) ||
        (isZhQuery && /[\u4e00-\u9fff]/.test(item.title || item.name)
          ? item.title || item.name
          : undefined);
      const enTitle =
        enMap.get(item.id) ||
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

    // Sort by search relevance and popularity so blockbuster movies and direct title matches rank at the top
    rawResults.sort(
      (a, b) =>
        computeSearchRelevance(b, query, cleanQuery) -
        computeSearchRelevance(a, query, cleanQuery)
    );

    const releasedCandidates = filterReleasedMedia(rawResults, 1).slice(0, 36);
    const verified = await filterItemsByServerAvailability(
      releasedCandidates,
      "movie",
      apiKey
    );
    return Response.json({ page: 1, results: verified });
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
};
