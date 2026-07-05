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
    <div className="flex flex-col pt-4 pb-24 min-h-full">
      <div className="flex flex-col gap-8">
        {history.length > 0 && <MediaRow title="Continue Watching" items={history} />}
        <MediaRow title="Trending Movies" items={trendingMovies} rows={2} />
        <MediaRow title="Trending TV Shows" items={trendingTV} rows={2} />
      </div>
    </div>
  );
}
