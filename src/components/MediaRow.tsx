import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { MediaItem } from "../types";
import { MediaCard } from "./MediaCard";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../utils";

export interface MediaCategoryOption {
  id: string;
  label: string;
}

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  rows?: 1 | 2;
  loading?: boolean;
  onClear?: () => void;
  categories?: MediaCategoryOption[];
  activeCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
}

const CATEGORY_PILL_WIDTH = 84;
const CATEGORY_PILL_GAP = 4;

export function MediaRow({
  title,
  items,
  rows = 1,
  loading = false,
  onClear,
  categories,
  activeCategory,
  onCategoryChange,
}: MediaRowProps) {
  const storageKey = `media_row_page_${title}_${activeCategory || "default"}`;
  const [page, setPage] = useState(() => {
    const saved = sessionStorage.getItem(storageKey);
    const parsed = saved ? parseInt(saved, 10) : 0;
    return Number.isNaN(parsed) ? 0 : parsed;
  });

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    const parsed = saved ? parseInt(saved, 10) : 0;
    setPage(Number.isNaN(parsed) ? 0 : parsed);
  }, [storageKey]);

  const itemsPerPage = rows === 2 ? 12 : 6;
  const totalPages = Math.ceil(items.length / itemsPerPage);

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      const clamped = Math.max(0, totalPages - 1);
      setPage(clamped);
      sessionStorage.setItem(storageKey, String(clamped));
    }
  }, [items.length, totalPages, page, storageKey]);

  // Sliding Category Switcher state & refs
  const categoryTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  const [canScrollCatLeft, setCanScrollCatLeft] = useState(false);
  const [canScrollCatRight, setCanScrollCatRight] = useState(true);

  const activeCategoryIndex = categories
    ? Math.max(
        0,
        categories.findIndex((c) => c.id === activeCategory)
      )
    : 0;

  const updateCatScrollButtons = useCallback(() => {
    const el = categoryTrackRef.current;
    if (!el) return;
    setCanScrollCatLeft(el.scrollLeft > 4);
    setCanScrollCatRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = categoryTrackRef.current;
    if (!el) return;
    updateCatScrollButtons();
    el.addEventListener("scroll", updateCatScrollButtons, { passive: true });
    window.addEventListener("resize", updateCatScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateCatScrollButtons);
      window.removeEventListener("resize", updateCatScrollButtons);
    };
  }, [updateCatScrollButtons, categories]);

  const isInitialCatMountRef = useRef(true);

  useLayoutEffect(() => {
    const el = categoryTrackRef.current;
    if (!el || !categories) return;
    const itemCenter =
      activeCategoryIndex * (CATEGORY_PILL_WIDTH + CATEGORY_PILL_GAP) +
      CATEGORY_PILL_WIDTH / 2;
    const targetScroll = Math.max(0, itemCenter - el.clientWidth / 2);
    if (isInitialCatMountRef.current) {
      isInitialCatMountRef.current = false;
      el.scrollLeft = targetScroll;
      updateCatScrollButtons();
    } else {
      el.scrollTo({ left: targetScroll, behavior: "smooth" });
    }
  }, [activeCategoryIndex, categories, updateCatScrollButtons]);

  const handleCatMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = categoryTrackRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;
  };

  const handleCatMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = categoryTrackRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
      e.preventDefault();
      el.scrollLeft = scrollLeftStartRef.current - walk * 1.25;
    }
  };

  const stopCatDragging = () => {
    isDraggingRef.current = false;
  };

  const handleCatWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = categoryTrackRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  const scrollCategoriesBy = (direction: -1 | 1) => {
    const el = categoryTrackRef.current;
    if (!el) return;
    const step = (CATEGORY_PILL_WIDTH + CATEGORY_PILL_GAP) * 2;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const visibleItems = items.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const showLeft = !loading && page > 0;
  const showRight = !loading && page < totalPages - 1;

  const prevPage = () => {
    if (page > 0) {
      const next = page - 1;
      setPage(next);
      sessionStorage.setItem(storageKey, String(next));
    }
  };

  const nextPage = () => {
    if (page < totalPages - 1) {
      const next = page + 1;
      setPage(next);
      sessionStorage.setItem(storageKey, String(next));
    }
  };

  if (!loading && (!items || items.length === 0) && !categories) return null;

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

        <div className="relative z-10 flex items-center gap-2.5 h-[46px] pointer-events-auto">
          {/* Right-Aligned 5-Category Sliding Switcher Capsule with Apple Liquid Glass Blur */}
          {categories && categories.length > 0 && onCategoryChange && (
            <div className="hidden lg:flex items-center gap-1 p-1 h-[46px] rounded-full bg-white/[0.07] backdrop-blur-md border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] shrink-0">
              <button
                type="button"
                onClick={() => scrollCategoriesBy(-1)}
                disabled={!canScrollCatLeft}
                aria-label="Scroll categories left"
                className={cn(
                  "group flex items-center justify-center w-[36px] h-[36px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none shrink-0",
                  canScrollCatLeft
                    ? "hover:bg-white/15 cursor-pointer text-white"
                    : "bg-transparent text-white/25 cursor-not-allowed pointer-events-none"
                )}
              >
                <ChevronLeft
                  className={cn(
                    "w-5 h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                    canScrollCatLeft ? "group-hover:scale-125 text-white" : "text-white/25"
                  )}
                />
              </button>

              <div
                ref={categoryTrackRef}
                onMouseDown={handleCatMouseDown}
                onMouseMove={handleCatMouseMove}
                onMouseUp={stopCatDragging}
                onMouseLeave={stopCatDragging}
                onWheel={handleCatWheel}
                className="relative overflow-x-auto no-scrollbar select-none cursor-grab active:cursor-grabbing w-[436px] h-[36px] rounded-full"
              >
                <div className="relative flex items-center gap-1 w-max h-[36px]">
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-white text-black rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                    style={{
                      width: `${CATEGORY_PILL_WIDTH}px`,
                      transform: `translate3d(${
                        activeCategoryIndex * (CATEGORY_PILL_WIDTH + CATEGORY_PILL_GAP)
                      }px, 0, 0)`,
                    }}
                  />

                  {categories.map((cat) => {
                    const isSelected = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          if (!hasDraggedRef.current) {
                            onCategoryChange(cat.id);
                          }
                        }}
                        tabIndex={0}
                        style={{ width: `${CATEGORY_PILL_WIDTH}px` }}
                        className={cn(
                          "group relative z-10 flex items-center justify-center h-[36px] text-sm rounded-full font-medium tracking-wide whitespace-nowrap shrink-0 transition-colors duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer",
                          "focus:outline-none focus-visible:outline-none select-none",
                          isSelected
                            ? "text-black"
                            : "text-white/75 hover:text-white focus:text-white"
                        )}
                      >
                        <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 group-focus:scale-110">
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => scrollCategoriesBy(1)}
                disabled={!canScrollCatRight}
                aria-label="Scroll categories right"
                className={cn(
                  "group flex items-center justify-center w-[36px] h-[36px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none shrink-0",
                  canScrollCatRight
                    ? "hover:bg-white/15 cursor-pointer text-white"
                    : "bg-transparent text-white/25 cursor-not-allowed pointer-events-none"
                )}
              >
                <ChevronRight
                  className={cn(
                    "w-5 h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                    canScrollCatRight ? "group-hover:scale-125 text-white" : "text-white/25"
                  )}
                />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-center h-[46px]">
            {onClear && (
              <button
                onClick={onClear}
                className="group relative mr-1 flex items-center justify-center h-[46px] px-4 text-sm font-medium text-red-400/85 hover:text-red-300 rounded-full transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
                title="Clear History"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full bg-red-500/[0.08] group-hover:bg-red-500/18 backdrop-blur-md border border-red-500/25 group-hover:border-red-500/40 shadow-[inset_0_1px_0_0_rgba(255,120,120,0.18),0_8px_24px_rgba(0,0,0,0.65)] transition-colors duration-300"
                />
                <div className="relative z-10 flex items-center gap-1.5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105">
                  <X className="w-4 h-4 stroke-[2]" />
                  <span>Clear</span>
                </div>
              </button>
            )}
            <button
              onClick={prevPage}
              disabled={!showLeft}
              className={`group flex items-center justify-center w-[46px] h-[46px] rounded-full bg-white/[0.07] backdrop-blur-md border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none ${
                showLeft
                  ? "hover:bg-white/15 cursor-pointer text-white"
                  : "text-white/25 cursor-not-allowed pointer-events-none"
              }`}
              aria-label="Previous page"
            >
              <ChevronLeft
                className={`w-7 h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                  showLeft ? "group-hover:scale-125 text-white" : "text-white/25"
                }`}
              />
            </button>
            <button
              onClick={nextPage}
              disabled={!showRight}
              className={`group flex items-center justify-center w-[46px] h-[46px] rounded-full bg-white/[0.07] backdrop-blur-md border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none ${
                showRight
                  ? "hover:bg-white/15 cursor-pointer text-white"
                  : "text-white/25 cursor-not-allowed pointer-events-none"
              }`}
              aria-label="Next page"
            >
              <ChevronRight
                className={`w-7 h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
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
