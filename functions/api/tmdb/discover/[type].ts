import { fetchTmdb, getTmdbKey, resolveTmdbGenre } from "../../../_shared/tmdb";

export const onRequestGet: PagesFunction = async (context) => {
  const typeParam = String(context.params.type || "");
  const type: "tv" | "movie" = typeParam === "tv" ? "tv" : "movie";
  const url = new URL(context.request.url);
  const year = url.searchParams.get("year") || String(new Date().getFullYear());
  const genre = url.searchParams.get("genre")?.trim() || "";
  const apiKey = getTmdbKey(context.env);

  const yearParam =
    type === "tv"
      ? `first_air_date_year=${encodeURIComponent(year)}`
      : `primary_release_year=${encodeURIComponent(year)}`;

  const genreLower = genre.toLowerCase();
  const isHk = genreLower === "hk";
  const isCn = genreLower === "cn";
  const isRegional = isHk || isCn;
  let genreParam = "";
  if (isHk) {
    genreParam = "&with_origin_country=HK";
  } else if (isCn) {
    genreParam = "&with_origin_country=CN%7CHK%7CTW";
  } else if (genre && genre !== "all") {
    const resolvedGenre = resolveTmdbGenre(type, genre);
    genreParam = `&with_genres=${encodeURIComponent(resolvedGenre)}`;
  }

  const minVotes = isRegional ? 1 : 3;
  const discoverMinVotes = isRegional ? 1 : 10;

  try {
    const data = await fetchTmdb(
      `/discover/${type}?sort_by=popularity.desc&vote_count.gte=${discoverMinVotes}&${yearParam}${genreParam}`,
      type,
      apiKey,
      minVotes
    );
    const hasResults = Array.isArray(data?.results) && data.results.length > 0;
    return Response.json(data, {
      headers: {
        "Cache-Control": hasResults
          ? "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400"
          : "public, max-age=0, s-maxage=60",
      },
    });
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
};
