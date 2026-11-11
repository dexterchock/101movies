import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { MediaItem } from "../types";
import { MediaCard } from "../components/MediaCard";
import { Search as SearchIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  cn,
  useResponsiveGrid,
  GRID_COLS_CLASS,
  GRID_ROWS_CLASS,
} from "../utils";

let cachedSearchQuery = "";
let cachedSearchResults: MediaItem[] = [];

export function Search() {
  const [query, setQuery] = useState(() => cachedSearchQuery);
  const [results, setResults] = useState<MediaItem[]>(() => cachedSearchResults);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { colsPerRow, rowsPerPage, maxGridHeight } = useResponsiveGrid(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === cachedSearchQuery && cachedSearchResults.length > 0) {
      setResults(cachedSearchResults);
      setLoading(false);
      return;
    }

    setPage(0);

    if (trimmed.length > 0) {
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

  const itemsPerPage = colsPerRow * rowsPerPage;
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

  // Touch swipe support for search results pagination
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && showRight) {
        setPage((p) => Math.min(totalPages - 1, p + 1));
      } else if (deltaX > 0 && showLeft) {
        setPage((p) => Math.max(0, p - 1));
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black select-none">
      {/* Responsive Top Control Bar */}
      <div className="shrink-0 relative flex items-center justify-between gap-2.5 sm:gap-4 w-full px-4 sm:px-6 md:px-8 pt-3 sm:pt-4 md:pt-5 pb-0 z-40">
        <div className="hidden lg:block w-[1px] h-[38px] sm:h-[46px]" />

        <div className="flex-1 lg:flex-none lg:w-[440px] xl:w-[524px] lg:absolute lg:left-1/2 lg:-translate-x-1/2 h-[38px] sm:h-[46px]">
          <div className="relative flex items-center w-full h-[38px] sm:h-[46px] rounded-full bg-neutral-900/70 border border-white/[0.14] focus-within:border-white/30 transition-colors duration-300">
            <SearchIcon
              className="absolute left-3.5 sm:left-4 text-white opacity-50 pointer-events-none w-4 h-4 sm:w-[18px] sm:h-[18px]"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, shows..."
              className="w-full h-full bg-transparent text-white text-xs sm:text-sm font-medium tracking-wide pl-10 sm:pl-11 pr-9 sm:pr-10 rounded-full outline-none focus:outline-none focus-visible:outline-none placeholder:text-white/40"
              tabIndex={0}
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                className="group absolute right-1 sm:right-1.5 flex items-center justify-center w-[30px] sm:w-[34px] h-[30px] sm:h-[34px] rounded-full text-white hover:bg-neutral-800/80 transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
              >
                <span className="inline-flex items-center justify-center opacity-65 group-hover:opacity-100 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-125">
                  <X size={15} />
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 sm:gap-2 items-center h-[38px] sm:h-[46px] shrink-0 ml-auto">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={!showLeft}
            className={cn(
              "group flex items-center justify-center w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] rounded-full border transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none",
              showLeft
                ? "bg-neutral-900/70 border-white/[0.14] hover:bg-neutral-800/80 cursor-pointer text-white"
                : "bg-neutral-900/45 border-white/[0.08] text-white cursor-not-allowed pointer-events-none"
            )}
            aria-label="Previous page"
          >
            <ChevronLeft
              className={cn(
                "w-5 h-5 sm:w-7 sm:h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                showLeft ? "group-hover:scale-125 text-white" : "text-white opacity-45"
              )}
            />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={!showRight}
            className={cn(
              "group flex items-center justify-center w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] rounded-full border transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none",
              showRight
                ? "bg-neutral-900/70 border-white/[0.14] hover:bg-neutral-800/80 cursor-pointer text-white"
                : "bg-neutral-900/45 border-white/[0.08] text-white cursor-not-allowed pointer-events-none"
            )}
            aria-label="Next page"
          >
            <ChevronRight
              className={cn(
                "w-5 h-5 sm:w-7 sm:h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                showRight ? "group-hover:scale-125 text-white" : "text-white opacity-45"
              )}
            />
          </button>
        </div>
      </div>

      {/* Viewport Grid (Clears Bottom Nav Pill, Vertically Balanced Across Screen Ratios) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 min-h-0 w-full flex flex-col justify-center px-4 sm:px-6 md:px-8 browse-stage-padding relative z-10"
      >
        {loading ? (
          <div
            className={cn(
              "grid gap-x-3 sm:gap-x-5 md:gap-x-7 gap-y-2.5 sm:gap-y-4 md:gap-y-5 w-full h-full min-h-0",
              GRID_COLS_CLASS[colsPerRow] || "grid-cols-6",
              GRID_ROWS_CLASS[rowsPerPage] || "grid-rows-2"
            )}
            style={maxGridHeight ? { maxHeight: `${maxGridHeight}px` } : undefined}
          >
            {Array.from({ length: itemsPerPage }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-1.5 sm:gap-2 h-full min-h-0 w-full">
                <div className="w-full flex-1 min-h-0 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                <div className="flex flex-col px-1 shrink-0 gap-1">
                  <div className="h-3.5 sm:h-4 w-3/4 rounded bg-white/5 animate-pulse" />
                  <div className="h-3 sm:h-3.5 w-1/3 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleResults.length > 0 ? (
          <div
            className={cn(
              "grid gap-x-3 sm:gap-x-5 md:gap-x-7 gap-y-2.5 sm:gap-y-4 md:gap-y-5 w-full h-full min-h-0",
              GRID_COLS_CLASS[colsPerRow] || "grid-cols-6",
              GRID_ROWS_CLASS[rowsPerPage] || "grid-rows-2"
            )}
            style={maxGridHeight ? { maxHeight: `${maxGridHeight}px` } : undefined}
          >
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
                className="flex flex-col gap-1.5 sm:gap-2 h-full min-h-0 w-full invisible pointer-events-none select-none"
              >
                <div className="w-full flex-1 min-h-0" />
                <div className="flex flex-col px-1 shrink-0">
                  <span className="text-xs sm:text-base leading-tight">&nbsp;</span>
                  <span className="text-[11px] sm:text-sm mt-0.5 leading-tight">&nbsp;</span>
                </div>
              </div>
            ))}
          </div>
        ) : query.trim().length > 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-lg sm:text-xl text-white/70 font-medium mb-2">
              No movies or shows found for "{query.trim()}"
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              Check your spelling or try a different keyword.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-xs sm:text-sm text-white/40 tracking-wide">
              Type to search movies and shows...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
