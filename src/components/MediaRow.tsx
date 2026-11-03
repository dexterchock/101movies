import { useState, useEffect } from "react";
import { MediaItem } from "../types";
import { MediaCard } from "./MediaCard";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  rows?: 1 | 2;
  loading?: boolean;
  onClear?: () => void;
}

export function MediaRow({ title, items, rows = 1, loading = false, onClear }: MediaRowProps) {
  const [page, setPage] = useState(0);

  const itemsPerPage = rows === 2 ? 12 : 6;
  const totalPages = Math.ceil(items.length / itemsPerPage);

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [items.length, totalPages, page]);

  const visibleItems = items.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const showLeft = !loading && page > 0;
  const showRight = !loading && page < totalPages - 1;

  const prevPage = () => {
    if (page > 0) setPage(page - 1);
  };

  const nextPage = () => {
    if (page < totalPages - 1) setPage(page + 1);
  };

  if (!loading && (!items || items.length === 0)) return null;

  const isSticky = rows === 2;

  return (
    <div className="flex flex-col w-full relative z-20">
      <div
        className={`relative flex items-center justify-between w-full px-6 md:px-8 pt-6 md:pt-8 pb-6 md:pb-8 ${
          isSticky ? "sticky top-0 z-40 pointer-events-none" : ""
        }`}
      >
        {isSticky && (
          <div className="absolute inset-x-0 -top-4 h-32 md:h-40 bg-gradient-to-b from-black via-black/60 to-transparent -z-10 pointer-events-none" />
        )}
        <h2 className="relative z-10 flex items-center h-[46px] text-2xl font-bold text-white/95 tracking-wide leading-none pointer-events-auto shrink-0">
          {title}
        </h2>
        <div className="relative z-10 flex items-center gap-4 h-[46px] pointer-events-auto">
          <div className="flex gap-2 items-center h-[46px]">
            {onClear && (
              <button
                onClick={onClear}
                className="group mr-1 flex items-center justify-center h-[46px] px-4 text-sm font-medium text-red-400/80 hover:text-red-300 bg-red-500/[0.06] hover:bg-red-500/15 rounded-full border border-red-500/20 hover:border-red-500/35 transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
                title="Clear History"
              >
                <div className="flex items-center gap-1.5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 will-change-transform transform-gpu backface-hidden">
                  <X className="w-4 h-4 stroke-[2]" />
                  <span>Clear</span>
                </div>
              </button>
            )}
            <button
              onClick={prevPage}
              disabled={!showLeft}
              className={`group flex items-center justify-center w-[46px] h-[46px] rounded-full bg-[#121212] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none ${
                showLeft
                  ? "hover:bg-white/15 cursor-pointer text-white"
                  : "text-white/25 cursor-not-allowed pointer-events-none"
              }`}
              aria-label="Previous page"
            >
              <ChevronLeft
                className={`w-7 h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu backface-hidden ${
                  showLeft ? "group-hover:scale-125 text-white" : "text-white/25"
                }`}
              />
            </button>
            <button
              onClick={nextPage}
              disabled={!showRight}
              className={`group flex items-center justify-center w-[46px] h-[46px] rounded-full bg-[#121212] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none ${
                showRight
                  ? "hover:bg-white/15 cursor-pointer text-white"
                  : "text-white/25 cursor-not-allowed pointer-events-none"
              }`}
              aria-label="Next page"
            >
              <ChevronRight
                className={`w-7 h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu backface-hidden ${
                  showRight ? "group-hover:scale-125 text-white" : "text-white/25"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8 px-6 md:px-8 w-full relative z-10">
        {loading
          ? Array.from({ length: itemsPerPage }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-3 w-full">
                <div className="w-full aspect-[2/3] rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-white/5 animate-pulse" />
              </div>
            ))
          : visibleItems.map((item) => (
              <MediaCard key={`${item.media_type || "media"}-${item.id}`} item={item} className="w-full" />
            ))}
      </div>
    </div>
  );
}
