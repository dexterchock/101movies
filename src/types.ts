export interface MediaCategoryOption {
  id: string;
  label: string;
}

export interface WatchProgress {
  sourceId?: string;
  seasonNumber?: number;
  seasonIndex?: number;
  episodeIndex?: number;
  episodeLabel?: string;
  currentTime?: number;
  duration?: number;
  updatedAt?: number;
}

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  en_title?: string;
  zh_title?: string;
  is_chinese_origin?: boolean;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  media_type?: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  watchProgress?: WatchProgress;
}

export interface MediaDetails extends MediaItem {
  runtime?: number;
  genres: { id: number; name: string }[];
  tagline: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  cast?: string[];
  origin_country?: string[];
  production_countries?: { iso_3166_1: string; name: string }[];
  original_language?: string;
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

export interface VodSeasonGroup {
  seasonNumber: number;
  name: string;
  vodId: string | number;
  vodName: string;
  episodes: VodEpisode[];
}

export interface ResolvedStreamSource {
  sourceId: string;
  sourceName: string;
  audioLang?: '粤语' | '国语';
  fromConfig: string;
  vodId: string | number;
  vodName: string;
  vodYear?: string;
  vodRemarks?: string;
  vodPic?: string;
  latencyMs: number;
  quality?: '4K' | '2K' | '1080P' | 'HD' | 'CAM' | string;
  playGroups: VodPlayGroup[];
  episodes: VodEpisode[];
  seasons?: VodSeasonGroup[];
}

export interface VodResolveResponse {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  searchQuery: string;
  candidateTitles: string[];
  releaseYear?: string;
  sources: ResolvedStreamSource[];
}
