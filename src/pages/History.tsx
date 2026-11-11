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
  getGridColsForWidth,
  getGridRowsForHeight,
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

  const [colsPerRow, setColsPerRow] = useState(() =>
    typeof window !== "undefined" ? getGridColsForWidth(window.innerWidth) : 6
  );
  const [rowsPerPage, setRowsPerPage] = useState(() =>
    typeof window !== "undefined" ? getGridRowsForHeight(window.innerHeight) : 2
  );
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const onResize = () => {
      setColsPerRow(getGridColsForWidth(window.innerWidth));
      setRowsPerPage(getGridRowsForHeight(window.innerHeight));
      setIsMobileView(window.innerWidth < 640);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
      <div className="shrink-0 relative flex items-center justify-between gap-2 w-full px-4 sm:px-6 md:px-8 pt-3 sm:pt-4 md:pt-6 pb-2.5 sm:pb-3 md:pb-5 z-40">
        {/* Left: All / Movies / Shows Filter Toggle */}
        <div
          role="tablist"
          aria-label="History Filter"
          className="relative flex items-center gap-1 p-0.5 sm:p-1 h-[38px] sm:h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[0_8px_32px_rgba(0,0,0,0.75)] shrink-0"
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
              className="group relative sm:mr-1 flex items-center justify-center h-[38px] sm:h-[46px] px-2.5 sm:px-4 text-xs sm:text-sm font-medium text-red-400 hover:text-red-300 rounded-full bg-red-500/[0.08] hover:bg-red-500/18 border border-red-500/25 hover:border-red-500/40 shadow-[0_8px_24px_rgba(0,0,0,0.65)] transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
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
              "group flex items-center justify-center w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[0_8px_32px_rgba(0,0,0,0.75)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none",
              showLeft
                ? "hover:bg-white/15 cursor-pointer text-white"
                : "text-white opacity-25 cursor-not-allowed pointer-events-none"
            )}
            aria-label="Previous page"
          >
            <ChevronLeft
              className={cn(
                "w-5 h-5 sm:w-7 sm:h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                showLeft ? "group-hover:scale-125 text-white" : "text-white opacity-25"
              )}
            />
          </button>
          <button
            onClick={nextPage}
            disabled={!showRight}
            className={cn(
              "group flex items-center justify-center w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[0_8px_32px_rgba(0,0,0,0.75)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none",
              showRight
                ? "hover:bg-white/15 cursor-pointer text-white"
                : "text-white opacity-25 cursor-not-allowed pointer-events-none"
            )}
            aria-label="Next page"
          >
            <ChevronRight
              className={cn(
                "w-5 h-5 sm:w-7 sm:h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                showRight ? "group-hover:scale-125 text-white" : "text-white opacity-25"
              )}
            />
          </button>
        </div>
      </div>

      {/* Viewport Grid (Clears Bottom Nav Pill, Supports Touch Swipe, Adapts to Orientation & Wide Screens) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 min-h-0 w-full px-4 sm:px-6 md:px-8 pb-[82px] sm:pb-[92px] md:pb-[98px] pb-[max(5.75rem,calc(5rem+env(safe-area-inset-bottom)))] relative z-10"
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
              rowsPerPage === 1 ? "grid-rows-1" : "grid-rows-2",
              "grid-cols-2 sm:grid-cols-3 md:grid-cols-6 xl:grid-cols-8",
              "md:max-h-[calc((100vw-64px)*0.54)] xl:max-h-[calc((100vw-64px)*0.45)]"
            )}
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
