import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { MediaItem } from "../types";
import { MediaCard } from "../components/MediaCard";
import { Search as SearchIcon, X } from "lucide-react";

let cachedSearchQuery = "";
let cachedSearchResults: MediaItem[] = [];

export function Search() {
  const [query, setQuery] = useState(() => cachedSearchQuery);
  const [results, setResults] = useState<MediaItem[]>(() => cachedSearchResults);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === cachedSearchQuery && cachedSearchResults.length > 0) {
      setResults(cachedSearchResults);
      setLoading(false);
      return;
    }

    if (trimmed.length > 2) {
      setLoading(true);
      const timer = setTimeout(() => {
        api
          .search(trimmed)
          .then((data) => {
            const filtered = data.filter(
              (item) => item.media_type === "movie" || item.media_type === "tv" || !item.media_type
            );
            cachedSearchQuery = trimmed;
            cachedSearchResults = filtered;
            setResults(filtered);
          })
          .finally(() => setLoading(false));
      }, 400);
      return () => clearTimeout(timer);
    } else {
      cachedSearchQuery = trimmed;
      cachedSearchResults = [];
      setResults([]);
      setLoading(false);
    }
  }, [query]);

  // Auto-focus input when entering empty search without scrolling container
  useEffect(() => {
    if (cachedSearchResults.length === 0) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const handleClear = () => {
    cachedSearchQuery = "";
    cachedSearchResults = [];
    setQuery("");
    setResults([]);
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pt-0 pb-0 min-h-full bg-black">
      <div className="flex flex-col w-full relative z-20">
        <div className="relative flex items-center justify-between gap-4 w-full px-6 md:px-8 pt-6 md:pt-8 pb-6 md:pb-8 sticky top-0 z-40 pointer-events-none">
          <div className="absolute inset-x-0 -top-4 h-32 md:h-40 bg-gradient-to-b from-black via-black/60 to-transparent -z-10 pointer-events-none" />

          <h2 className="relative z-10 flex items-center h-[46px] text-2xl font-bold text-white/95 tracking-wide leading-none pointer-events-auto shrink-0">
            Search
          </h2>

          <div className="relative z-10 flex items-center justify-end flex-1 max-w-xs sm:max-w-sm md:max-w-md h-[46px] pointer-events-auto">
            <div className="relative flex items-center w-full h-[46px] rounded-full bg-white/[0.07] backdrop-blur-md border border-white/[0.14] focus-within:border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] transition-colors duration-300">
              <SearchIcon
                className="absolute left-4 text-white/50 pointer-events-none"
                size={18}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies, TV shows..."
                className="w-full h-full bg-transparent text-white text-sm font-medium tracking-wide pl-11 pr-10 rounded-full outline-none focus:outline-none focus-visible:outline-none placeholder:text-white/40"
                tabIndex={0}
              />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear search"
                  className="group absolute right-1.5 flex items-center justify-center w-[34px] h-[34px] rounded-full text-white/60 hover:text-white hover:bg-white/15 transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
                >
                  <X
                    size={16}
                    className="transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-125 will-change-transform transform-gpu backface-hidden"
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8 px-6 md:px-8 w-full relative z-10">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-3 w-full">
                <div className="w-full aspect-[2/3] rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8 px-6 md:px-8 w-full relative z-10">
            {results.map((item) => (
              <MediaCard
                key={`${item.media_type || "media"}-${item.id}`}
                item={item}
                className="w-full"
              />
            ))}
          </div>
        ) : query.trim().length > 2 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 md:px-8 text-center relative z-10">
            <p className="text-xl text-white/70 font-medium mb-2">
              No movies or TV shows found for "{query.trim()}"
            </p>
            <p className="text-sm text-gray-500">
              Check your spelling or try a different keyword.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-6 md:px-8 text-center relative z-10">
            <p className="text-sm text-white/40 tracking-wide">
              Type at least 3 characters to search movies and TV shows.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
