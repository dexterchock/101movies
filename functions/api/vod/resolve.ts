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
    const hasSources = Array.isArray(resolved?.sources) && resolved.sources.length > 0;
    return Response.json(resolved, {
      headers: {
        "Cache-Control": hasSources
          ? "public, max-age=1800, s-maxage=3600, stale-while-revalidate=43200"
          : "public, max-age=0, s-maxage=60",
      },
    });
  } catch (err: any) {
    console.error("Failed to resolve VOD streams:", err);
    return Response.json(
      { error: "Failed to resolve VOD streams" },
      { status: 500 }
    );
  }
};
