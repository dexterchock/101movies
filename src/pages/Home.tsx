import { useEffect, useState } from "react";
import { api } from "../api";
import { MediaItem } from "../types";
import { MediaRow, MediaCategoryOption } from "../components/MediaRow";

const MOVIE_CATEGORIES: MediaCategoryOption[] = [
  { id: "all", label: "All" },
  { id: "28", label: "Action" },
  { id: "878", label: "Sci-Fi" },
  { id: "35", label: "Comedy" },
  { id: "18", label: "Drama" },
  { id: "53", label: "Thriller" },
  { id: "16", label: "Animation" },
  { id: "27", label: "Horror" },
  { id: "10749", label: "Romance" },
];

const TV_CATEGORIES: MediaCategoryOption[] = [
  { id: "all", label: "All" },
  { id: "hk", label: "HK" },
  { id: "18", label: "Drama" },
  { id: "10765", label: "Sci-Fi" },
  { id: "10759", label: "Action" },
  { id: "35", label: "Comedy" },
  { id: "16", label: "Animation" },
  { id: "80", label: "Crime" },
  { id: "9648", label: "Mystery" },
];

const cachedMoviesByCat = new Map<string, MediaItem[]>();
const cachedTVByCat = new Map<string, MediaItem[]>();

export function Home() {
  const [movieCategory, setMovieCategory] = useState<string>(() => {
    return sessionStorage.getItem("home_movie_category") || "all";
  });
  const [tvCategory, setTvCategory] = useState<string>(() => {
    return sessionStorage.getItem("home_tv_category") || "all";
  });

  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>(
    () => cachedMoviesByCat.get(movieCategory) || []
  );
  const [trendingTV, setTrendingTV] = useState<MediaItem[]>(
    () => cachedTVByCat.get(tvCategory) || []
  );
  const [loadingMovies, setLoadingMovies] = useState(
    !cachedMoviesByCat.has(movieCategory)
  );
  const [loadingTV, setLoadingTV] = useState(!cachedTVByCat.has(tvCategory));
  const [history, setHistory] = useState<MediaItem[]>(() => {
    try {
      const stored = localStorage.getItem("watch_history");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    sessionStorage.setItem("home_movie_category", movieCategory);
    const cached = cachedMoviesByCat.get(movieCategory);
    if (cached) {
      setTrendingMovies(cached);
      setLoadingMovies(false);
      return;
    }

    let active = true;
    setLoadingMovies(true);
    api
      .getTrendingMovies(movieCategory)
      .then((data) => {
        if (active) {
          cachedMoviesByCat.set(movieCategory, data);
          setTrendingMovies(data);
        }
      })
      .finally(() => {
        if (active) setLoadingMovies(false);
      });
    return () => {
      active = false;
    };
  }, [movieCategory]);

  useEffect(() => {
    sessionStorage.setItem("home_tv_category", tvCategory);
    const cached = cachedTVByCat.get(tvCategory);
    if (cached) {
      setTrendingTV(cached);
      setLoadingTV(false);
      return;
    }

    let active = true;
    setLoadingTV(true);
    api
      .getTrendingTV(tvCategory)
      .then((data) => {
        if (active) {
          cachedTVByCat.set(tvCategory, data);
          setTrendingTV(data);
        }
      })
      .finally(() => {
        if (active) setLoadingTV(false);
      });
    return () => {
      active = false;
    };
  }, [tvCategory]);

  const handleClearHistory = () => {
    localStorage.removeItem("watch_history");
    setHistory([]);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pt-0 pb-0 min-h-full bg-black">
      {history.length > 0 && (
        <MediaRow title="Continue Watching" items={history} onClear={handleClearHistory} />
      )}
      <MediaRow
        title="Trending Movies"
        items={trendingMovies}
        rows={2}
        loading={loadingMovies}
        categories={MOVIE_CATEGORIES}
        activeCategory={movieCategory}
        onCategoryChange={setMovieCategory}
      />
      <MediaRow
        title="Trending TV Shows"
        items={trendingTV}
        rows={2}
        loading={loadingTV}
        categories={TV_CATEGORIES}
        activeCategory={tvCategory}
        onCategoryChange={setTvCategory}
      />
    </div>
  );
}
