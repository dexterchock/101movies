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

    const rawResults = Array.isArray(data.results)
      ? data.results
          .filter(
            (item: any) =>
              item && (item.media_type === "movie" || item.media_type === "tv")
          )
          .map((item: any) => ({
            ...item,
            zh_title: zhMap.get(item.id) || item.zh_title,
          }))
      : [];

    const releasedCandidates = filterReleasedMedia(rawResults, 1);
    const verified = await filterItemsByServerAvailability(
      releasedCandidates,
      "movie",
      apiKey
    );
    return Response.json({ ...data, results: verified });
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
};
