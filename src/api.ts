import { MediaItem, MediaDetails, TmdbResponse } from "./types";

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
  getDetails: async (type: 'movie' | 'tv', id: string): Promise<MediaDetails> => {
    const res = await fetch(`/api/tmdb/${type}/${id}`);
    const data = await res.json();
    return data;
  },
  getRankings: async (type: 'movie' | 'tv', year: number): Promise<MediaItem[]> => {
    const res = await fetch(`/api/tmdb/discover/${type}?year=${year}`);
    const data = await res.json();
    return data.results || [];
  }
};
