import { fetchMediaDetails, getTmdbKey } from "../../../_shared/tmdb";

export const onRequestGet: PagesFunction = async (context) => {
  const id = String(context.params.id || "");
  const apiKey = getTmdbKey(context.env);

  if (!id || !apiKey) {
    return Response.json({});
  }

  try {
    const details = await fetchMediaDetails("tv", id, apiKey);
    return Response.json(details);
  } catch (err: any) {
    console.error(err);
    return Response.json(
      { error: "Failed to fetch TV details from TMDB" },
      { status: 500 }
    );
  }
};
