import React, { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../api";
import { MediaItem } from "../types";
import { MediaCard } from "../components/MediaCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../utils";

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 1970;
const ALL_YEARS = Array.from(
  { length: CURRENT_YEAR - START_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i
);

const CATEGORIES: { id: "movie" | "tv"; label: string }[] = [
  { id: "movie", label: "Movies" },
  { id: "tv", label: "TV Shows" },
];

const YEAR_PILL_WIDTH = 64;
const YEAR_PILL_GAP = 4;

export function Rankings() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);

  const yearTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const activeCategoryIndex = CATEGORIES.findIndex((c) => c.id === mediaType);
  const activeYearIndex = Math.max(0, ALL_YEARS.indexOf(year));

  const updateScrollButtons = useCallback(() => {
    const el = yearTrackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = yearTrackRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons]);

  // Center the active year pill smoothly when selected
  useEffect(() => {
    const el = yearTrackRef.current;
    if (!el) return;
    const itemCenter =
      activeYearIndex * (YEAR_PILL_WIDTH + YEAR_PILL_GAP) + YEAR_PILL_WIDTH / 2;
    const targetScroll = Math.max(0, itemCenter - el.clientWidth / 2);
    el.scrollTo({ left: targetScroll, behavior: "smooth" });
  }, [activeYearIndex]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getRankings(mediaType, year)
      .then((data) => {
        if (active) {
          setItems(data.map((item) => ({ ...item, media_type: mediaType })));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mediaType, year]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = yearTrackRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = yearTrackRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
      e.preventDefault();
      el.scrollLeft = scrollLeftStartRef.current - walk * 1.25;
    }
  };

  const stopDragging = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = yearTrackRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  const scrollYearsBy = (direction: -1 | 1) => {
    const el = yearTrackRef.current;
    if (!el) return;
    const step = (YEAR_PILL_WIDTH + YEAR_PILL_GAP) * 2;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pt-0 pb-0 min-h-screen bg-black">
      <div className="flex flex-col w-full relative z-20">
        <div className="relative flex items-center justify-between w-full px-6 md:px-8 pt-6 md:pt-8 pb-6 md:pb-8 sticky top-0 z-40 pointer-events-none">
          <div className="absolute inset-x-0 -top-4 h-32 md:h-40 bg-gradient-to-b from-black via-black/60 to-transparent -z-10 pointer-events-none" />

          <h2 className="relative z-10 flex items-center h-[46px] text-2xl font-bold text-white/95 tracking-wide leading-none pointer-events-auto shrink-0">
            Top Rankings
          </h2>

          <div className="relative z-10 flex items-center gap-2.5 h-[46px] pointer-events-auto">
            {/* Movies / TV Shows Capsule Toggle - Matches 46px Header Control Height */}
            <div
              role="tablist"
              aria-label="Content Category"
              className="relative flex items-center gap-1 p-1 h-[46px] rounded-full bg-[#121212] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] shrink-0"
            >
              <div
                className="absolute top-1 bottom-1 bg-white text-black rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                style={{
                  width: "96px",
                  left: `calc(4px + ${activeCategoryIndex} * 96px + ${activeCategoryIndex} * 4px)`,
                }}
              />
              {CATEGORIES.map((cat) => {
                const isActive = mediaType === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setMediaType(cat.id)}
                    tabIndex={0}
                    className={cn(
                      "group relative z-10 flex items-center justify-center w-[96px] h-[36px] text-sm rounded-full transition-colors duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none font-medium tracking-wide cursor-pointer",
                      "focus:outline-none focus-visible:outline-none select-none",
                      isActive
                        ? "text-black"
                        : "text-white/70 hover:text-white focus:text-white"
                    )}
                  >
                    <span className="inline-block transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 group-focus:scale-110 will-change-transform transform-gpu backface-hidden">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Swipeable Year Switcher Capsule (Compact 3-Year Window, 46px Height) */}
            <div className="flex items-center gap-1 p-1 h-[46px] rounded-full bg-[#121212] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] shrink-0">
              <button
                type="button"
                onClick={() => scrollYearsBy(-1)}
                disabled={!canScrollLeft}
                aria-label="Scroll to newer years"
                className={cn(
                  "group flex items-center justify-center w-[36px] h-[36px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none shrink-0",
                  canScrollLeft
                    ? "hover:bg-white/15 cursor-pointer text-white"
                    : "bg-transparent text-white/25 cursor-not-allowed pointer-events-none"
                )}
              >
                <ChevronLeft
                  className={cn(
                    "w-5 h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu backface-hidden",
                    canScrollLeft ? "group-hover:scale-125 text-white" : "text-white/25"
                  )}
                />
              </button>

              <div
                ref={yearTrackRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDragging}
                onMouseLeave={stopDragging}
                onWheel={handleWheel}
                className="relative overflow-x-auto no-scrollbar select-none cursor-grab active:cursor-grabbing w-[200px] h-[36px] rounded-full"
              >
                <div className="relative flex items-center gap-1 w-max h-[36px]">
                  {/* Sliding Active Year Pill */}
                  <div
                    className="absolute top-0 bottom-0 bg-white text-black rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                    style={{
                      width: `${YEAR_PILL_WIDTH}px`,
                      left: `calc(${activeYearIndex} * ${YEAR_PILL_WIDTH}px + ${activeYearIndex} * ${YEAR_PILL_GAP}px)`,
                    }}
                  />

                  {ALL_YEARS.map((y) => {
                    const isSelected = year === y;
                    return (
                      <button
                        key={y}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          if (!hasDraggedRef.current) {
                            setYear(y);
                          }
                        }}
                        tabIndex={0}
                        style={{ width: `${YEAR_PILL_WIDTH}px` }}
                        className={cn(
                          "group relative z-10 flex items-center justify-center h-[36px] text-sm rounded-full font-medium tracking-wide tabular-nums whitespace-nowrap shrink-0 transition-colors duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer",
                          "focus:outline-none focus-visible:outline-none select-none",
                          isSelected
                            ? "text-black"
                            : "text-white/70 hover:text-white focus:text-white"
                        )}
                      >
                        <span className="inline-block transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 group-focus:scale-110 will-change-transform transform-gpu backface-hidden">
                          {y}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => scrollYearsBy(1)}
                disabled={!canScrollRight}
                aria-label="Scroll to older years"
                className={cn(
                  "group flex items-center justify-center w-[36px] h-[36px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none shrink-0",
                  canScrollRight
                    ? "hover:bg-white/15 cursor-pointer text-white"
                    : "bg-transparent text-white/25 cursor-not-allowed pointer-events-none"
                )}
              >
                <ChevronRight
                  className={cn(
                    "w-5 h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu backface-hidden",
                    canScrollRight ? "group-hover:scale-125 text-white" : "text-white/25"
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {!loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 md:px-8 text-center relative z-10">
            <p className="text-xl text-white/70 font-medium mb-2">
              No rankings found for {year}
            </p>
            <p className="text-sm text-gray-500">
              Try swiping to a different year or switching between Movies and TV Shows.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8 px-6 md:px-8 w-full relative z-10">
            {loading
              ? Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="flex flex-col gap-3 w-full">
                    <div className="w-full aspect-[2/3] rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                    <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
                    <div className="h-3 w-1/3 rounded bg-white/5 animate-pulse" />
                  </div>
                ))
              : items.map((item, index) => (
                  <MediaCard
                    key={`${mediaType}-${year}-${item.id}`}
                    item={item}
                    rank={index + 1}
                    className="w-full"
                  />
                ))}
          </div>
        )}
      </div>
    </div>
  );
}
