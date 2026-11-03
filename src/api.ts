import {
  MediaItem,
  MediaDetails,
  TvboxConfigItem,
  VodSite,
  VodResolveResponse,
} from "./types";

export const api = {
  getTrendingMovies: async (): Promise<MediaItem[]> => {
    const res = await fetch("/api/tmdb/trending/movie");
    const data = await res.json();
    return data.results || [];
  },
  getTrendingTV: async (): Promise<MediaItem[]> => {
    const res = await fetch("/api/tmdb/trending/tv");
    const data = await res.json();
    return data.results || [];
  },
  search: async (query: string): Promise<MediaItem[]> => {
    const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results || [];
  },
  getDetails: async (type: "movie" | "tv", id: string): Promise<MediaDetails> => {
    const res = await fetch(`/api/tmdb/${type}/${id}`);
    const data = await res.json();
    return data;
  },
  getRankings: async (type: "movie" | "tv", year: number): Promise<MediaItem[]> => {
    const res = await fetch(`/api/tmdb/discover/${type}?year=${year}`);
    const data = await res.json();
    return data.results || [];
  },
  getTvboxConfigs: async (): Promise<{
    configs: TvboxConfigItem[];
    sites: VodSite[];
  }> => {
    const res = await fetch("/api/tvbox/configs");
    return res.json();
  },
  parseTvboxConfig: async (
    url: string,
    name?: string
  ): Promise<{
    result: {
      ok: boolean;
      type: "single" | "multi" | "unknown";
      totalSites: number;
      extractedSites: VodSite[];
      subRepos?: { name: string; url: string }[];
      message?: string;
    };
    sites: VodSite[];
  }> => {
    const res = await fetch("/api/tvbox/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name }),
    });
    return res.json();
  },
  pingVodSite: async (
    siteId: string
  ): Promise<{ id: string; ok: boolean; latencyMs: number }> => {
    const res = await fetch(`/api/vod/ping/${encodeURIComponent(siteId)}`);
    return res.json();
  },
  resolveVodStreams: async (
    type: "movie" | "tv",
    id: string,
    customKeyword?: string,
    disabledIds: string[] = []
  ): Promise<VodResolveResponse> => {
    const params = new URLSearchParams({
      type,
      id,
    });
    if (customKeyword && customKeyword.trim()) {
      params.set("wd", customKeyword.trim());
    }
    if (disabledIds.length > 0) {
      params.set("disabled", disabledIds.join(","));
    }
    const res = await fetch(`/api/vod/resolve?${params.toString()}`);
    return res.json();
  },
};
