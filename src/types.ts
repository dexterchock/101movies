export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  media_type?: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
}

export interface MediaDetails extends MediaItem {
  runtime?: number;
  genres: { id: number; name: string }[];
  tagline: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
}

export interface TmdbResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TvboxConfigItem {
  id: string;
  name: string;
  url: string;
  type: 'single' | 'multi';
  description: string;
  author?: string;
  cmsSiteCount?: number;
  totalSiteCount?: number;
}

export interface VodSite {
  id: string;
  name: string;
  api: string;
  fromConfig: string;
  enabled?: boolean;
}

export interface VodEpisode {
  name: string;
  url: string;
}

export interface VodPlayGroup {
  groupName: string;
  episodes: VodEpisode[];
}

export interface ResolvedStreamSource {
  sourceId: string;
  sourceName: string;
  fromConfig: string;
  vodId: string | number;
  vodName: string;
  vodYear?: string;
  vodRemarks?: string;
  vodPic?: string;
  latencyMs: number;
  playGroups: VodPlayGroup[];
  episodes: VodEpisode[];
}

export interface VodResolveResponse {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  searchQuery: string;
  candidateTitles: string[];
  releaseYear?: string;
  sources: ResolvedStreamSource[];
}
