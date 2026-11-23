import {
  computeSearchRelevance,
  getTmdbKey,
  searchTmdbWithVodAvailability,
} from "../../_shared/tmdbSearch";

export { computeSearchRelevance };

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const query = url.searchParams.get("q")?.trim() || "";
  const apiKey = getTmdbKey(context.env);

  if (!query || !apiKey) {
    return Response.json(
      { results: [] },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } }
    );
  }

  try {
    const verified = await searchTmdbWithVodAvailability(query, apiKey);
    const hasResults = Array.isArray(verified) && verified.length > 0;
    return Response.json(
      { page: 1, results: verified },
      {
        headers: {
          "Cache-Control": hasResults
            ? "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400"
            : "public, max-age=0, s-maxage=60",
        },
      }
    );
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
};
