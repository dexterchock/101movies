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
      const results = await fetchTrendingHk("movie", apiKey);
      return Response.json(
        {
          page: 1,
          results,
          total_pages: 1,
          total_results: results.length,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        }
      );
    } catch (err: any) {
      console.error(err);
      return Response.json(
        { error: "Failed to fetch HK movies from TMDB" },
        { status: 500 }
      );
    }
  }

  try {
    let data;
    if (genre && genre !== "all") {
      const resolvedGenre = resolveTmdbGenre("movie", genre);
      data = await fetchTmdb(
        `/discover/movie?sort_by=popularity.desc&vote_count.gte=10&with_genres=${encodeURIComponent(
          resolvedGenre
        )}`,
        "movie",
        apiKey
      );
    } else {
      data = await fetchTmdb("/trending/movie/week", "movie", apiKey);
    }
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
};
