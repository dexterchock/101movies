import { fetchMediaDetails, getTmdbKey } from "../../../_shared/tmdb";

export const onRequestGet: PagesFunction = async (context) => {
  const id = String(context.params.id || "");
  const apiKey = getTmdbKey(context.env);

  if (!id || !apiKey) {
    return Response.json({});
  }

  try {
    const details = await fetchMediaDetails("movie", id, apiKey);
    return Response.json(details, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: any) {
    console.error(err);
    return Response.json(
      { error: "Failed to fetch movie details from TMDB" },
      { status: 500 }
    );
  }
};
