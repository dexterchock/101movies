import { getTmdbKey } from "../../_shared/tmdb";
import { resolveStreamsForMedia } from "../../_shared/tvboxService";

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const typeParam = url.searchParams.get("type");
  const type: "tv" | "movie" = typeParam === "tv" ? "tv" : "movie";
  const tmdbId = url.searchParams.get("id") || "";
  const customKeyword = url.searchParams.get("wd") || undefined;
  const seasonParam = url.searchParams.get("season");
  const parsedSeason = seasonParam ? parseInt(seasonParam, 10) : NaN;
  const seasonNumber =
    Number.isFinite(parsedSeason) && parsedSeason > 0 ? parsedSeason : undefined;
  const rawMode = url.searchParams.get("raw") === "1";
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
      seasonNumber,
      rawMode,
    });
    const hasSources = Array.isArray(resolved?.sources) && resolved.sources.length > 0;
    const cacheControl = rawMode
      ? resolved?.hadTransientErrors
        ? "no-store"
        : hasSources
        ? "public, max-age=300, s-maxage=600"
        : "public, max-age=0, s-maxage=60"
      : hasSources
      ? "public, max-age=1800, s-maxage=3600, stale-while-revalidate=43200"
      : resolved?.hadTransientErrors
      ? "no-store"
      : "public, max-age=0, s-maxage=60";
    return Response.json(resolved, {
      headers: {
        "Cache-Control": cacheControl,
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
