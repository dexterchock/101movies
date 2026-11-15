import {
  fetchTmdb,
  fetchTrendingHk,
  getTmdbKey,
  resolveTmdbGenre,
} from "../../../_shared/tmdb";

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const genre = url.searchParams.get("genre")?.trim() || "";
  const apiKey = getTmdbKey(context.env);

  if (genre.toLowerCase() === "hk") {
    if (!apiKey) {
      return Response.json({ results: [] });
    }
    try {
      const results = await fetchTrendingHk("tv", apiKey);
      return Response.json(
        {
          page: 1,
          results,
          total_pages: 1,
          total_results: results.length,
        },
        {
          headers: {
            "Cache-Control":
              results.length > 0
                ? "public, s-maxage=3600, stale-while-revalidate=86400"
                : "public, s-maxage=60",
          },
        }
      );
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
    const hasResults = Array.isArray(data?.results) && data.results.length > 0;
    return Response.json(data, {
      headers: {
        "Cache-Control": hasResults
          ? "public, s-maxage=3600, stale-while-revalidate=86400"
          : "public, s-maxage=60",
      },
    });
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
};
