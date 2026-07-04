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
}

export interface TmdbResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}
