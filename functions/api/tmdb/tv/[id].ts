import { fetchMediaDetails, getTmdbKey } from "../../../_shared/tmdb";

export const onRequestGet: PagesFunction = async (context) => {
  const id = String(context.params.id || "");
  const apiKey = getTmdbKey(context.env);

  if (!id || !apiKey) {
    return Response.json(
      {},
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=60" } }
    );
  }

  try {
    const details = await fetchMediaDetails("tv", id, apiKey);
    const hasDetails = Boolean(
      details && details.id && details.success !== false
    );
    return Response.json(details, {
      headers: {
        "Cache-Control": hasDetails
          ? "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400"
          : "public, max-age=0, s-maxage=60",
      },
    });
  } catch (err: any) {
    console.error(err);
    return Response.json(
      { error: "Failed to fetch TV details from TMDB" },
      { status: 500 }
    );
  }
};
