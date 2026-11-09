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
    const response = await fetch(tmdbUrl);
    const data: any = await response.json();
    const releasedCandidates = filterReleasedMedia(
      Array.isArray(data.results)
        ? data.results.filter(
            (item: any) => item.media_type === "movie" || item.media_type === "tv"
          )
        : [],
      1
    );
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
