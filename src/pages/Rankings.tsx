import { useEffect, useState } from "react";
import { api } from "../api";
import { MediaItem } from "../types";
import { MediaCard } from "../components/MediaCard";

export function Rankings() {
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    api.getRankings("movie", year).then(setMovies);
  }, [year]);

  return (
    <div className="flex flex-col pt-12 px-12 min-h-full">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-white mb-2">Top Rankings</h1>
          <p className="text-gray-400 text-xl">Highest rated movies of {year}</p>
        </div>
        <div className="flex gap-4">
          {[2024, 2023, 2022, 2021].map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              tabIndex={0}
              className={`px-6 py-3 rounded-xl font-medium text-lg transition-all outline-none focus:ring-4 focus:ring-white focus:scale-105 ${year === y ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-24">
        {movies.map((item, index) => (
          <MediaCard key={item.id} item={item} rank={index + 1} className="aspect-[2/3]" />
        ))}
      </div>
    </div>
  );
}
