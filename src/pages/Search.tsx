import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { MediaItem } from "../types";
import { MediaCard } from "../components/MediaCard";
import { Search as SearchIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../utils";

let cachedSearchQuery = "";
let cachedSearchResults: MediaItem[] = [];

function getColsForWidth(width: number): number {
  if (width >= 768) return 6;
  if (width >= 640) return 3;
  return 2;
}

export function Search() {
  const [query, setQuery] = useState(() => cachedSearchQuery);
  const [results, setResults] = useState<MediaItem[]>(() => cachedSearchResults);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [colsPerRow, setColsPerRow] = useState(() =>
    typeof window !== "undefined" ? getColsForWidth(window.innerWidth) : 6
  );

  useEffect(() => {
    const onResize = () => setColsPerRow(getColsForWidth(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === cachedSearchQuery && cachedSearchResults.length > 0) {
      setResults(cachedSearchResults);
      setLoading(false);
      return;
    }

    setPage(0);

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
      try {
        inputRef.current?.focus({ preventScroll: true });
      } catch {
        try {
          inputRef.current?.focus();
        } catch {}
      }
    }
  }, []);

  const handleClear = () => {
    cachedSearchQuery = "";
    cachedSearchResults = [];
    setQuery("");
    setResults([]);
    setPage(0);
    try {
      inputRef.current?.focus({ preventScroll: true });
    } catch {
      try {
        inputRef.current?.focus();
      } catch {}
    }
  };

  const itemsPerPage = colsPerRow * 2;
  const totalPages = Math.ceil(results.length / itemsPerPage);

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [results.length, totalPages, page]);

  const visibleResults = results.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );
  const placeholderCount = !loading
    ? Math.max(0, itemsPerPage - visibleResults.length)
    : 0;

  const showLeft = !loading && page > 0;
  const showRight = !loading && page < totalPages - 1;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black select-none">
      {/* Locked Top Control Bar */}
      <div className="shrink-0 relative flex items-center justify-between gap-3 sm:gap-4 w-full px-6 md:px-8 pt-5 md:pt-6 pb-4 md:pb-5 z-40">
        <div className="hidden lg:block w-[1px] h-[46px]" />

        <div className="flex-1 lg:flex-none lg:w-[440px] xl:w-[524px] lg:absolute lg:left-1/2 lg:-translate-x-1/2 h-[46px]">
          <div className="relative flex items-center w-full h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] focus-within:border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] transition-colors duration-300">
            <SearchIcon
              className="absolute left-4 text-white/50 pointer-events-none"
              size={18}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, shows..."
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

        <div className="flex gap-2 items-center h-[46px] shrink-0 ml-auto">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={!showLeft}
            className={cn(
              "group flex items-center justify-center w-[46px] h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none",
              showLeft
                ? "hover:bg-white/15 cursor-pointer text-white"
                : "text-white/25 cursor-not-allowed pointer-events-none"
            )}
            aria-label="Previous page"
          >
            <ChevronLeft
              className={cn(
                "w-7 h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu",
                showLeft ? "group-hover:scale-125 text-white" : "text-white/25"
              )}
            />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={!showRight}
            className={cn(
              "group flex items-center justify-center w-[46px] h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none",
              showRight
                ? "hover:bg-white/15 cursor-pointer text-white"
                : "text-white/25 cursor-not-allowed pointer-events-none"
            )}
            aria-label="Next page"
          >
            <ChevronRight
              className={cn(
                "w-7 h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu",
                showRight ? "group-hover:scale-125 text-white" : "text-white/25"
              )}
            />
          </button>
        </div>
      </div>

      {/* Locked 2-Row Viewport Grid (Zero Scroll, Clears Bottom Nav Pill) */}
      <div className="flex-1 min-h-0 w-full px-6 md:px-8 pb-[78px] sm:pb-[88px] md:pb-[96px] relative z-10">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 grid-rows-2 gap-x-5 sm:gap-x-6 md:gap-x-7 gap-y-3.5 sm:gap-y-4 md:gap-y-5 w-full h-full md:max-h-[calc((100vw-64px)*0.54)] min-h-0">
            {Array.from({ length: itemsPerPage }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-2 h-full min-h-0 w-full">
                <div className="w-full flex-1 min-h-0 rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                <div className="flex flex-col px-1 shrink-0 gap-1">
                  <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
                  <div className="h-3.5 w-1/3 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleResults.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 grid-rows-2 gap-x-5 sm:gap-x-6 md:gap-x-7 gap-y-3.5 sm:gap-y-4 md:gap-y-5 w-full h-full md:max-h-[calc((100vw-64px)*0.54)] min-h-0">
            {visibleResults.map((item) => (
              <MediaCard
                key={`${item.media_type || "media"}-${item.id}`}
                item={item}
                className="w-full"
              />
            ))}
            {Array.from({ length: placeholderCount }).map((_, idx) => (
              <div
                key={`placeholder-${idx}`}
                aria-hidden="true"
                className="flex flex-col gap-2 h-full min-h-0 w-full invisible pointer-events-none select-none"
              >
                <div className="w-full flex-1 min-h-0" />
                <div className="flex flex-col px-1 shrink-0">
                  <span className="text-sm sm:text-base leading-tight">&nbsp;</span>
                  <span className="text-xs sm:text-sm mt-0.5 leading-tight">&nbsp;</span>
                </div>
              </div>
            ))}
          </div>
        ) : query.trim().length > 2 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-xl text-white/70 font-medium mb-2">
              No movies or shows found for "{query.trim()}"
            </p>
            <p className="text-sm text-gray-500">
              Check your spelling or try a different keyword.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-white/40 tracking-wide">
              Type at least 3 characters to search movies and shows.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
