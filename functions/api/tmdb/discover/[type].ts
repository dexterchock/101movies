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

  let genreParam = "";
  if (genre.toLowerCase() === "hk") {
    genreParam = "&with_origin_country=HK";
  } else if (genre && genre !== "all") {
    const resolvedGenre = resolveTmdbGenre(type, genre);
    genreParam = `&with_genres=${encodeURIComponent(resolvedGenre)}`;
  }

  try {
    const data = await fetchTmdb(
      `/discover/${type}?sort_by=popularity.desc&vote_count.gte=10&${yearParam}${genreParam}`,
      type,
      apiKey
    );
    return Response.json(data);
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
};
