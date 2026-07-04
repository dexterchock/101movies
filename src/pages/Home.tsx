import { useEffect, useState } from "react";
import { api } from "../api";
import { MediaItem } from "../types";
import { MediaRow } from "../components/MediaRow";

export function Home() {
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [trendingTV, setTrendingTV] = useState<MediaItem[]>([]);
  const [history, setHistory] = useState<MediaItem[]>([]);

  useEffect(() => {
    api.getTrendingMovies().then(setTrendingMovies);
    api.getTrendingTV().then(setTrendingTV);
    
    try {
      const stored = localStorage.getItem("watch_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  return (
    <div className="flex flex-col pt-12 pb-24 min-h-full">
      <div className="px-12 mb-8">
        <h1 className="text-5xl font-bold tracking-tight text-white mb-2">Discover</h1>
        <p className="text-gray-400 text-xl">Top picks for you</p>
      </div>

      <div className="flex flex-col gap-8">
        {history.length > 0 && <MediaRow title="Continue Watching" items={history} />}
        <MediaRow title="Trending Movies" items={trendingMovies} />
        <MediaRow title="Trending TV Shows" items={trendingTV} />
      </div>
    </div>
  );
}
