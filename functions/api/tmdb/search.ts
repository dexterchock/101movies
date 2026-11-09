import {
  TMDB_BASE_URL,
  filterReleasedMedia,
  getTmdbKey,
} from "../../_shared/tmdb";
import { filterItemsByServerAvailability } from "../../_shared/tvboxService";

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const query = url.searchParams.get("q")?.trim() || "";
  const apiKey = getTmdbKey(context.env);

  if (!query || !apiKey) {
    return Response.json({ results: [] });
  }

  try {
    const isZhQuery = /[\u4e00-\u9fff]/.test(query);
    const tmdbUrl = `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(
      query
    )}&api_key=${apiKey}`;
    const tmdbZhUrl = `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(
      query
    )}&language=zh-CN&api_key=${apiKey}`;

    const [enRes, zhRes] = await Promise.allSettled<any>([
      fetch(tmdbUrl).then((r) => r.json()),
      fetch(tmdbZhUrl).then((r) => r.json()),
    ]);

    const data: any = enRes.status === "fulfilled" ? enRes.value : {};
    const zhData: any = zhRes.status === "fulfilled" ? zhRes.value : {};

    const zhMap = new Map<number, string>();
    if (Array.isArray(zhData?.results)) {
      for (const item of zhData.results) {
        if (item && typeof item.id === "number") {
          const t = item.title || item.name;
          if (t && /[\u4e00-\u9fff]/.test(t)) {
            zhMap.set(item.id, t.trim());
          }
        }
      }
    }

    const enMap = new Map<number, string>();
    if (Array.isArray(data?.results)) {
      for (const item of data.results) {
        if (item && typeof item.id === "number") {
          const t = item.title || item.name;
          if (t) {
            enMap.set(item.id, t.trim());
          }
        }
      }
    }

    const primaryList = isZhQuery
      ? Array.isArray(zhData?.results)
        ? zhData.results
        : []
      : Array.isArray(data?.results)
      ? data.results
      : [];
    const secondaryList = isZhQuery
      ? Array.isArray(data?.results)
        ? data.results
        : []
      : Array.isArray(zhData?.results)
      ? zhData.results
      : [];

    const seen = new Set<number>();
    const rawResults: any[] = [];

    for (const item of [...primaryList, ...secondaryList]) {
      if (!item || typeof item.id !== "number" || seen.has(item.id)) continue;
      if (item.media_type !== "movie" && item.media_type !== "tv") continue;
      seen.add(item.id);

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

    const releasedCandidates = filterReleasedMedia(rawResults, 1);
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
