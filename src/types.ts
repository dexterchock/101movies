export interface MediaCategoryOption {
  id: string;
  label: string;
}

export const MEDIA_CATEGORIES: MediaCategoryOption[] = [
  { id: "all", label: "All" },
  { id: "hk", label: "HK" },
  { id: "action", label: "Action" },
  { id: "scifi", label: "Sci-Fi" },
  { id: "comedy", label: "Comedy" },
  { id: "drama", label: "Drama" },
  { id: "animation", label: "Animation" },
  { id: "thriller", label: "Thriller" },
  { id: "crime", label: "Crime" },
  { id: "mystery", label: "Mystery" },
  { id: "horror", label: "Horror" },
  { id: "romance", label: "Romance" },
];

export function resolveGenreId(type: "movie" | "tv", genre?: string): string {
  if (!genre || genre === "all") return "";
  const g = genre.toLowerCase().trim();
  switch (g) {
    case "action":
    case "28":
    case "10759":
      return type === "tv" ? "10759" : "28";
    case "scifi":
    case "sci-fi":
    case "878":
    case "10765":
      return type === "tv" ? "10765" : "878";
    case "comedy":
    case "35":
      return "35";
    case "drama":
    case "18":
      return "18";
    case "animation":
    case "16":
      return "16";
    case "thriller":
    case "53":
      return type === "tv" ? "80,9648" : "53";
    case "crime":
    case "80":
      return "80";
    case "mystery":
    case "9648":
      return "9648";
    case "horror":
    case "27":
      return type === "tv" ? "9648" : "27";
    case "romance":
    case "10749":
      return type === "tv" ? "18" : "10749";
    case "adventure":
    case "12":
      return type === "tv" ? "10759" : "12";
    default:
      return genre;
  }
}

export function normalizeCategoryId(cat?: string | null): string {
  if (!cat || cat === "all") return "all";
  const g = cat.toLowerCase().trim();
  if (g === "hk") return "hk";
  if (g === "28" || g === "10759" || g === "action") return "action";
  if (g === "878" || g === "10765" || g === "scifi" || g === "sci-fi") return "scifi";
  if (g === "35" || g === "comedy") return "comedy";
  if (g === "18" || g === "drama") return "drama";
  if (g === "16" || g === "animation") return "animation";
  if (g === "53" || g === "thriller") return "thriller";
  if (g === "80" || g === "crime") return "crime";
  if (g === "9648" || g === "mystery") return "mystery";
  if (g === "27" || g === "horror") return "horror";
  if (g === "10749" || g === "romance") return "romance";
  if (g === "12" || g === "adventure") return "action";
  return cat;
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
