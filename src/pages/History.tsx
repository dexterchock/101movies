import React, { useEffect, useState, useRef } from "react";
import { MediaItem } from "../types";
import { MediaCard } from "../components/MediaCard";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  cn,
  loadWatchHistory,
  clearWatchHistory,
  removeFromWatchHistory,
  resolveMediaItemType,
  useResponsiveGrid,
  GRID_COLS_CLASS,
  GRID_ROWS_CLASS,
} from "../utils";

type HistoryFilter = "all" | "movie" | "tv";

const FILTER_OPTIONS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "Shows" },
];

export function History() {
  const [history, setHistory] = useState<MediaItem[]>(loadWatchHistory);
  const [filterType, setFilterType] = useState<HistoryFilter>(() => {
    try {
      const saved = sessionStorage.getItem("history_filter_type");
      if (saved === "movie" || saved === "tv") return saved;
    } catch {}
    return "all";
  });

  const { colsPerRow, rowsPerPage, maxGridHeight, isMobileView } = useResponsiveGrid(false);

  useEffect(() => {
    try {
      sessionStorage.setItem("history_filter_type", filterType);
    } catch {}
  }, [filterType]);

  const storageKey = `history_page_${filterType}`;
  const [page, setPage] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      const parsed = saved ? parseInt(saved, 10) : 0;
      return Number.isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      const parsed = saved ? parseInt(saved, 10) : 0;
      setPage(Number.isNaN(parsed) ? 0 : parsed);
    } catch {
      setPage(0);
    }
  }, [storageKey]);

  const filteredItems =
    filterType === "all"
      ? history
      : history.filter((item) => resolveMediaItemType(item) === filterType);

  const itemsPerPage = colsPerRow * rowsPerPage;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      const clamped = Math.max(0, totalPages - 1);
      setPage(clamped);
      try {
        sessionStorage.setItem(storageKey, String(clamped));
      } catch {}
    } else if (totalPages === 0 && page !== 0) {
      setPage(0);
    }
  }, [filteredItems.length, totalPages, page, storageKey]);

  const visibleItems = filteredItems.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );
  const placeholderCount = Math.max(0, itemsPerPage - visibleItems.length);

  const showLeft = page > 0;
  const showRight = page < totalPages - 1;

  const prevPage = () => {
    if (page > 0) {
      const next = page - 1;
      setPage(next);
      try {
        sessionStorage.setItem(storageKey, String(next));
      } catch {}
    }
  };

  const nextPage = () => {
    if (page < totalPages - 1) {
      const next = page + 1;
      setPage(next);
      try {
        sessionStorage.setItem(storageKey, String(next));
      } catch {}
    }
  };

  const handleClearHistory = () => {
    clearWatchHistory();
    setHistory([]);
    setPage(0);
    try {
      sessionStorage.removeItem("history_page_all");
      sessionStorage.removeItem("history_page_movie");
      sessionStorage.removeItem("history_page_tv");
    } catch {}
  };

  const handleRemoveHistoryItem = (itemToRemove: MediaItem) => {
    setHistory((prev) => removeFromWatchHistory(prev, itemToRemove));
  };

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
      if (deltaX < 0) nextPage();
      else prevPage();
    }
  };

  const activeFilterIndex = Math.max(
    0,
    FILTER_OPTIONS.findIndex((opt) => opt.id === filterType)
  );
  const filterTabWidth = isMobileView ? 58 : 84;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black select-none">
      {/* Responsive Top Control Bar */}
      <div className="shrink-0 relative flex items-center justify-between gap-2 w-full px-4 sm:px-6 md:px-8 pt-3 sm:pt-4 md:pt-5 pb-0 z-40">
        {/* Left: All / Movies / Shows Filter Toggle */}
        <div
          role="tablist"
          aria-label="History Filter"
          className="relative flex items-center gap-1 p-0.5 sm:p-1 h-[38px] sm:h-[46px] rounded-full bg-neutral-900/70 border border-white/[0.14] shrink-0"
        >
          <div
            className="absolute top-0.5 sm:top-1 bottom-0.5 sm:bottom-1 left-0.5 sm:left-1 bg-white text-black rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
            style={{
              width: `${filterTabWidth}px`,
              transform: `translate3d(${activeFilterIndex * (filterTabWidth + 4)}px, 0, 0)`,
            }}
          />
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filterType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilterType(opt.id)}
                tabIndex={0}
                style={{ width: `${filterTabWidth}px` }}
                className={cn(
                  "group relative z-10 flex items-center justify-center h-[30px] sm:h-[36px] text-xs sm:text-sm rounded-full transition-colors duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none font-medium tracking-wide cursor-pointer",
                  "focus:outline-none focus-visible:outline-none select-none",
                  isActive
                    ? "text-black"
                    : "text-white/75 hover:text-white focus:text-white"
                )}
              >
                <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 group-focus:scale-110">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Clear History + Pagination Arrows */}
        <div className="flex gap-1.5 sm:gap-2 items-center h-[38px] sm:h-[46px] shrink-0">
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="group relative sm:mr-1 flex items-center justify-center h-[38px] sm:h-[46px] px-2.5 sm:px-4 text-xs sm:text-sm font-medium text-red-400 hover:text-red-300 rounded-full bg-red-950/60 hover:bg-red-900/70 border border-red-500/30 hover:border-red-400/45 transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
              title="Clear History"
            >
              <div className="relative z-10 flex items-center gap-1 sm:gap-1.5 opacity-85 group-hover:opacity-100 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105">
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                <span>Clear</span>
              </div>
            </button>
          )}
          <button
            onClick={prevPage}
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
            onClick={nextPage}
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
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-lg sm:text-xl text-white/70 font-medium mb-2">
              {history.length === 0
                ? "No watch history yet"
                : filterType === "tv"
                ? "No shows in watch history"
                : "No movies in watch history"}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md">
              {history.length === 0
                ? "Start watching a movie or show to pick up right where you left off."
                : "Try switching the filter tab or watching more titles."}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-x-3 sm:gap-x-5 md:gap-x-7 gap-y-2.5 sm:gap-y-4 md:gap-y-5 w-full h-full min-h-0",
              GRID_COLS_CLASS[colsPerRow] || "grid-cols-6",
              GRID_ROWS_CLASS[rowsPerPage] || "grid-rows-2"
            )}
            style={maxGridHeight ? { maxHeight: `${maxGridHeight}px` } : undefined}
          >
            {visibleItems.map((item) => (
              <MediaCard
                key={`${item.media_type || resolveMediaItemType(item)}-${item.id}`}
                item={item}
                className="w-full"
                onRemove={() => handleRemoveHistoryItem(item)}
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
        )}
      </div>
    </div>
  );
}
