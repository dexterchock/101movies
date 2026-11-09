import { getTmdbKey } from "../../_shared/tmdb";
import { resolveStreamsForMedia } from "../../_shared/tvboxService";

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const typeParam = url.searchParams.get("type");
  const type: "tv" | "movie" = typeParam === "tv" ? "tv" : "movie";
  const tmdbId = url.searchParams.get("id") || "";
  const customKeyword = url.searchParams.get("wd") || undefined;
  const disabledStr = url.searchParams.get("disabled") || "";
  const disabledSiteIds = disabledStr
    ? disabledStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const apiKey = getTmdbKey(context.env);

  try {
    const resolved = await resolveStreamsForMedia({
      tmdbId,
      type,
      customKeyword,
      disabledSiteIds,
      tmdbApiKey: apiKey,
    });
    return Response.json(resolved);
  } catch (err: any) {
    console.error("Failed to resolve VOD streams:", err);
    return Response.json(
      { error: "Failed to resolve VOD streams" },
      { status: 500 }
    );
  }
};
