import {
  TMDB_BASE_URL,
  fetchTmdb,
  filterReleasedMedia,
  getTmdbKey,
  resolveTmdbGenre,
  tmdbListCache,
} from "../../../_shared/tmdb";
import { filterItemsByServerAvailability } from "../../../_shared/tvboxService";

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const genre = url.searchParams.get("genre")?.trim() || "";
  const apiKey = getTmdbKey(context.env);

  if (genre.toLowerCase() === "hk") {
    if (!apiKey) {
      return Response.json({ results: [] });
    }
    const hkCacheKey = "trending_tv_hk";
    const cachedHk = tmdbListCache.get(hkCacheKey);
    if (cachedHk && cachedHk.expiresAt > Date.now()) {
      return Response.json({
        page: 1,
        results: cachedHk.results,
        total_pages: 1,
        total_results: cachedHk.results.length,
      });
    }

    try {
      const recentYear = new Date().getFullYear() - 3;
      const recentDate = `${recentYear}-01-01`;
      const [recentRes, popRes] = await Promise.allSettled<any>([
        fetch(
          `${TMDB_BASE_URL}/discover/tv?sort_by=popularity.desc&with_origin_country=HK&first_air_date.gte=${recentDate}&vote_count.gte=1&api_key=${apiKey}`
        ).then((r) => r.json()),
        fetch(
          `${TMDB_BASE_URL}/discover/tv?sort_by=popularity.desc&with_origin_country=HK&vote_count.gte=2&api_key=${apiKey}`
        ).then((r) => r.json()),
      ]);

      const combined: any[] = [];
      const seenIds = new Set<number>();
      for (const settled of [recentRes, popRes]) {
        if (settled.status === "fulfilled" && Array.isArray((settled.value as any)?.results)) {
          for (const item of (settled.value as any).results) {
            if (item && typeof item.id === "number" && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              combined.push({ ...item, media_type: "tv" });
            }
          }
        }
      }

      const releasedCandidates = filterReleasedMedia(combined, 1).slice(0, 28);
      const results = await filterItemsByServerAvailability(
        releasedCandidates,
        "tv",
        apiKey
      );

      tmdbListCache.set(hkCacheKey, {
        results,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      return Response.json({
        page: 1,
        results,
        total_pages: 1,
        total_results: results.length,
      });
    } catch (err: any) {
      console.error(err);
      return Response.json(
        { error: "Failed to fetch HK dramas from TMDB" },
        { status: 500 }
      );
    }
  }

  try {
    let data;
    if (genre && genre !== "all") {
      const resolvedGenre = resolveTmdbGenre("tv", genre);
      data = await fetchTmdb(
        `/discover/tv?sort_by=popularity.desc&vote_count.gte=10&with_genres=${encodeURIComponent(
          resolvedGenre
        )}`,
        "tv",
        apiKey
      );
    } else {
      data = await fetchTmdb("/trending/tv/week", "tv", apiKey);
    }
    return Response.json(data);
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
};
