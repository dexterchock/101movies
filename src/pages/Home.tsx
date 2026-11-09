import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import { api } from "../api";
import { MediaItem, MediaCategoryOption } from "../types";
import { MediaCard } from "../components/MediaCard";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn, safeScrollTo } from "../utils";

const MOVIE_CATEGORIES: MediaCategoryOption[] = [
  { id: "all", label: "All" },
  { id: "hk", label: "HK" },
  { id: "28", label: "Action" },
  { id: "878", label: "Sci-Fi" },
  { id: "35", label: "Comedy" },
  { id: "18", label: "Drama" },
  { id: "53", label: "Thriller" },
  { id: "16", label: "Animation" },
  { id: "27", label: "Horror" },
  { id: "10749", label: "Romance" },
];

const TV_CATEGORIES: MediaCategoryOption[] = [
  { id: "all", label: "All" },
  { id: "hk", label: "HK" },
  { id: "18", label: "Drama" },
  { id: "10765", label: "Sci-Fi" },
  { id: "10759", label: "Action" },
  { id: "35", label: "Comedy" },
  { id: "16", label: "Animation" },
  { id: "80", label: "Crime" },
  { id: "9648", label: "Mystery" },
];

const CATEGORY_PILL_WIDTH_DESKTOP = 84;
const CATEGORY_PILL_WIDTH_MOBILE = 72;
const CATEGORY_PILL_GAP = 4;

const cachedMoviesByCat = new Map<string, MediaItem[]>();
const cachedTVByCat = new Map<string, MediaItem[]>();

function getColsForWidth(width: number): number {
  if (width >= 1280) return 8; // 8 columns on modern wide screens (proper 2:3 vertical poster)
  if (width >= 768) return 6;
  if (width >= 640) return 3;
  return 2;
}

function getRowsForHeight(height: number): number {
  // On short landscape viewports (e.g. iPhone landscape ~390px), 1 row prevents card squishing
  return height < 500 ? 1 : 2;
}

export function Home() {
  const [history, setHistory] = useState<MediaItem[]>(() => {
    try {
      const stored = localStorage.getItem("watch_history");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [mediaType, setMediaType] = useState<"movie" | "tv" | "history">(() => {
    const saved = sessionStorage.getItem("trending_media_type");
    if (saved === "tv") return "tv";
    if (saved === "history") return "history";
    return "movie";
  });

  // Fallback to "movie" if "history" was selected but history is now empty
  const effectiveMediaType: "movie" | "tv" | "history" =
    mediaType === "history" && history.length === 0 ? "movie" : mediaType;

  useEffect(() => {
    if (effectiveMediaType !== mediaType) {
      setMediaType(effectiveMediaType);
    }
  }, [effectiveMediaType, mediaType]);

  const [movieCategory, setMovieCategory] = useState<string>(() => {
    return sessionStorage.getItem("home_movie_category") || "all";
  });
  const [tvCategory, setTvCategory] = useState<string>(() => {
    return sessionStorage.getItem("home_tv_category") || "all";
  });

  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>(
    () => cachedMoviesByCat.get(movieCategory) || []
  );
  const [trendingTV, setTrendingTV] = useState<MediaItem[]>(
    () => cachedTVByCat.get(tvCategory) || []
  );
  const [loadingMovies, setLoadingMovies] = useState(
    !cachedMoviesByCat.has(movieCategory)
  );
  const [loadingTV, setLoadingTV] = useState(!cachedTVByCat.has(tvCategory));

  const [colsPerRow, setColsPerRow] = useState(() =>
    typeof window !== "undefined" ? getColsForWidth(window.innerWidth) : 6
  );
  const [rowsPerPage, setRowsPerPage] = useState(() =>
    typeof window !== "undefined" ? getRowsForHeight(window.innerHeight) : 2
  );
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setColsPerRow(getColsForWidth(window.innerWidth));
      setRowsPerPage(getRowsForHeight(window.innerHeight));
      setIsMobileView(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("trending_media_type", effectiveMediaType);
    } catch {}
  }, [effectiveMediaType]);

  useEffect(() => {
    try {
      sessionStorage.setItem("home_movie_category", movieCategory);
    } catch {}
    const cached = cachedMoviesByCat.get(movieCategory);
    if (cached) {
      setTrendingMovies(cached);
      setLoadingMovies(false);
      return;
    }

    let active = true;
    setLoadingMovies(true);
    api
      .getTrendingMovies(movieCategory)
      .then((data) => {
        if (active) {
          cachedMoviesByCat.set(movieCategory, data);
          setTrendingMovies(data);
        }
      })
      .finally(() => {
        if (active) setLoadingMovies(false);
      });
    return () => {
      active = false;
    };
  }, [movieCategory]);

  useEffect(() => {
    try {
      sessionStorage.setItem("home_tv_category", tvCategory);
    } catch {}
    const cached = cachedTVByCat.get(tvCategory);
    if (cached) {
      setTrendingTV(cached);
      setLoadingTV(false);
      return;
    }

    let active = true;
    setLoadingTV(true);
    api
      .getTrendingTV(tvCategory)
      .then((data) => {
        if (active) {
          cachedTVByCat.set(tvCategory, data);
          setTrendingTV(data);
        }
      })
      .finally(() => {
        if (active) setLoadingTV(false);
      });
    return () => {
      active = false;
    };
  }, [tvCategory]);

  const handleClearHistory = () => {
    localStorage.removeItem("watch_history");
    setHistory([]);
    setMediaType("movie");
  };

  const handleRemoveHistoryItem = (itemToRemove: MediaItem) => {
    setHistory((prev) => {
      const targetType =
        itemToRemove.media_type === "tv" ||
        (!itemToRemove.media_type && !itemToRemove.title && itemToRemove.name)
          ? "tv"
          : "movie";
      const updated = prev.filter((h) => {
        const hType =
          h.media_type === "tv" || (!h.media_type && !h.title && h.name)
            ? "tv"
            : "movie";
        return !(h.id === itemToRemove.id && hType === targetType);
      });
      if (updated.length > 0) {
        localStorage.setItem("watch_history", JSON.stringify(updated));
      } else {
        localStorage.removeItem("watch_history");
      }
      return updated;
    });
  };

  const mediaTypesList: { id: "movie" | "tv" | "history"; label: string }[] =
    history.length > 0
      ? [
          { id: "movie", label: "Movies" },
          { id: "tv", label: "Shows" },
          { id: "history", label: "History" },
        ]
      : [
          { id: "movie", label: "Movies" },
          { id: "tv", label: "Shows" },
        ];

  const activeMediaTypeIndex = Math.max(
    0,
    mediaTypesList.findIndex((c) => c.id === effectiveMediaType)
  );
  const mediaTypeTabWidth = isMobileView
    ? history.length > 0
      ? 62
      : 72
    : 88;

  const activeCategories =
    effectiveMediaType === "movie"
      ? MOVIE_CATEGORIES
      : effectiveMediaType === "tv"
      ? TV_CATEGORIES
      : [];
  const activeCategory =
    effectiveMediaType === "movie" ? movieCategory : tvCategory;
  const setActiveCategory =
    effectiveMediaType === "movie" ? setMovieCategory : setTvCategory;

  const activeItems =
    effectiveMediaType === "movie"
      ? trendingMovies
      : effectiveMediaType === "tv"
      ? trendingTV
      : history;
  const loading =
    effectiveMediaType === "movie"
      ? loadingMovies
      : effectiveMediaType === "tv"
      ? loadingTV
      : false;

  const storageKey = `trending_page_${effectiveMediaType}_${activeCategory}`;
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

  const itemsPerPage = colsPerRow * rowsPerPage;
  const totalPages = Math.ceil(activeItems.length / itemsPerPage);

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      const clamped = Math.max(0, totalPages - 1);
      setPage(clamped);
      try {
        sessionStorage.setItem(storageKey, String(clamped));
      } catch {}
    }
  }, [activeItems.length, totalPages, page, storageKey]);

  const visibleItems = activeItems.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );
  const placeholderCount = !loading
    ? Math.max(0, itemsPerPage - visibleItems.length)
    : 0;

  const showLeft = !loading && page > 0;
  const showRight = !loading && page < totalPages - 1;

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

  // Sliding Category Switcher state & refs
  const categoryTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  const [canScrollCatLeft, setCanScrollCatLeft] = useState(false);
  const [canScrollCatRight, setCanScrollCatRight] = useState(true);

  const activeCategoryIndex = Math.max(
    0,
    activeCategories.findIndex((c) => c.id === activeCategory)
  );

  const categoryPillWidth = isMobileView
    ? CATEGORY_PILL_WIDTH_MOBILE
    : CATEGORY_PILL_WIDTH_DESKTOP;

  const updateCatScrollButtons = useCallback(() => {
    const el = categoryTrackRef.current;
    if (!el) return;
    setCanScrollCatLeft(el.scrollLeft > 4);
    setCanScrollCatRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const centerCatTrack = useCallback(
    (smooth: boolean) => {
      const el = categoryTrackRef.current;
      if (!el || activeCategories.length === 0) return;
      const stride = categoryPillWidth + CATEGORY_PILL_GAP;
      const visiblePills = Math.max(1, Math.round(el.clientWidth / stride));
      const half = Math.floor(visiblePills / 2);
      const startIdx = Math.max(
        0,
        Math.min(activeCategories.length - visiblePills, activeCategoryIndex - half)
      );
      const targetScroll = startIdx * stride;
      safeScrollTo(el, targetScroll, smooth);
      updateCatScrollButtons();
    },
    [activeCategories.length, activeCategoryIndex, categoryPillWidth, updateCatScrollButtons]
  );

  useEffect(() => {
    const el = categoryTrackRef.current;
    if (!el) return;
    const onResize = () => centerCatTrack(false);
    updateCatScrollButtons();
    el.addEventListener("scroll", updateCatScrollButtons, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", updateCatScrollButtons);
      window.removeEventListener("resize", onResize);
    };
  }, [updateCatScrollButtons, centerCatTrack, effectiveMediaType]);

  const isInitialCatMountRef = useRef(true);

  useLayoutEffect(() => {
    try {
      if (isInitialCatMountRef.current) {
        isInitialCatMountRef.current = false;
        centerCatTrack(false);
      } else {
        centerCatTrack(true);
      }
    } catch (err) {
      console.warn("centerCatTrack failed in useLayoutEffect:", err);
    }
  }, [centerCatTrack]);

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
    const stride = categoryPillWidth + CATEGORY_PILL_GAP;
    const visiblePills = Math.max(1, Math.round(el.clientWidth / stride));
    if (visiblePills <= 1) {
      const nextIndex = Math.max(
        0,
        Math.min(activeCategories.length - 1, activeCategoryIndex + direction)
      );
      setActiveCategory(activeCategories[nextIndex].id);
      return;
    }
    const maxIdx = Math.max(0, activeCategories.length - visiblePills);
    const currentIdx = Math.round(el.scrollLeft / stride);
    const step = Math.max(1, visiblePills - 1);
    const nextIdx = Math.max(0, Math.min(maxIdx, currentIdx + direction * step));
    const targetLeft =
      nextIdx >= maxIdx
        ? el.scrollWidth - el.clientWidth
        : nextIdx <= 0
          ? 0
          : nextIdx * stride;
    safeScrollTo(el, targetLeft, true);
  };

  // Touch swipe handling for effortless page navigation on mobile
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
      if (deltaX < 0) {
        nextPage();
      } else {
        prevPage();
      }
    }
  };

  const displayCategories =
    activeCategories.length > 0 ? activeCategories : MOVIE_CATEGORIES;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black select-none">
      {/* Responsive Top Control Bar (Cleanly fits mobile portrait & landscape) */}
      <div className="shrink-0 relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 sm:gap-x-3 gap-y-2 w-full px-4 sm:px-6 md:px-8 pt-3 sm:pt-4 md:pt-6 pb-2.5 sm:pb-3 md:pb-5 z-40">
        {/* Left: Movies / Shows (and History) Capsule Toggle */}
        <div
          role="tablist"
          aria-label="Content Type"
          className="order-1 relative flex items-center gap-1 p-0.5 sm:p-1 h-[38px] sm:h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] shrink-0"
        >
          <div
            className="absolute top-0.5 sm:top-1 bottom-0.5 sm:bottom-1 left-0.5 sm:left-1 bg-white text-black rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
            style={{
              width: `${mediaTypeTabWidth}px`,
              transform: `translate3d(${activeMediaTypeIndex * (mediaTypeTabWidth + 4)}px, 0, 0)`,
            }}
          />
          {mediaTypesList.map((cat) => {
            const isActive = effectiveMediaType === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setMediaType(cat.id)}
                tabIndex={0}
                style={{ width: `${mediaTypeTabWidth}px` }}
                className={cn(
                  "group relative z-10 flex items-center justify-center h-[30px] sm:h-[36px] text-xs sm:text-sm rounded-full transition-colors duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none font-medium tracking-wide cursor-pointer",
                  "focus:outline-none focus-visible:outline-none select-none",
                  isActive
                    ? "text-black"
                    : "text-white/75 hover:text-white focus:text-white"
                )}
              >
                <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 group-focus:scale-110 will-change-transform transform-gpu">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Center on Desktop/Landscape / Row 2 on Portrait Mobile: Sliding Category Switcher Capsule */}
        <div
          className={cn(
            "order-3 sm:order-2 w-full sm:w-auto sm:flex-1 lg:flex-none flex justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2 min-w-0",
            effectiveMediaType === "history" && "invisible pointer-events-none"
          )}
        >
          <div className="flex items-center justify-between gap-1 p-0.5 sm:p-1 h-[38px] sm:h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] shrink-0">
            <button
              type="button"
              onClick={() => scrollCategoriesBy(-1)}
              disabled={!canScrollCatLeft}
              aria-label="Scroll categories left"
              className={cn(
                "group flex items-center justify-center w-[30px] sm:w-[36px] h-[30px] sm:h-[36px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none shrink-0",
                canScrollCatLeft
                  ? "hover:bg-white/15 cursor-pointer text-white"
                  : "bg-transparent text-white/25 cursor-not-allowed pointer-events-none"
              )}
            >
              <ChevronLeft
                className={cn(
                  "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu",
                  canScrollCatLeft
                    ? "group-hover:scale-125 text-white"
                    : "text-white/25"
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
              className="relative overflow-x-auto no-scrollbar select-none cursor-grab active:cursor-grabbing w-[160px] min-[400px]:w-[210px] sm:w-[230px] md:w-[280px] lg:w-[280px] xl:w-[436px] h-[30px] sm:h-[36px] rounded-full"
            >
              <div className="relative flex items-center gap-1 w-max h-[30px] sm:h-[36px]">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-white text-black rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                  style={{
                    width: `${categoryPillWidth}px`,
                    transform: `translate3d(${
                      activeCategoryIndex *
                      (categoryPillWidth + CATEGORY_PILL_GAP)
                    }px, 0, 0)`,
                  }}
                />

                {displayCategories.map((cat) => {
                  const isSelected = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        if (!hasDraggedRef.current) {
                          setActiveCategory(cat.id);
                        }
                      }}
                      tabIndex={0}
                      style={{ width: `${categoryPillWidth}px` }}
                      className={cn(
                        "group relative z-10 flex items-center justify-center h-[30px] sm:h-[36px] text-xs sm:text-sm rounded-full font-medium tracking-wide whitespace-nowrap shrink-0 transition-colors duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer",
                        "focus:outline-none focus-visible:outline-none select-none",
                        isSelected
                          ? "text-black"
                          : "text-white/75 hover:text-white focus:text-white"
                      )}
                    >
                      <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 group-focus:scale-110 will-change-transform transform-gpu">
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
                "group flex items-center justify-center w-[30px] sm:w-[36px] h-[30px] sm:h-[36px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none shrink-0",
                canScrollCatRight
                  ? "hover:bg-white/15 cursor-pointer text-white"
                  : "bg-transparent text-white/25 cursor-not-allowed pointer-events-none"
              )}
            >
              <ChevronRight
                className={cn(
                  "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu",
                  canScrollCatRight
                    ? "group-hover:scale-125 text-white"
                    : "text-white/25"
                )}
              />
            </button>
          </div>
        </div>

        {/* Right: Page Navigation Buttons (+ Clear when History is active) */}
        <div className="order-2 sm:order-3 flex gap-1.5 sm:gap-2 items-center h-[38px] sm:h-[46px] shrink-0">
          {effectiveMediaType === "history" && (
            <button
              onClick={handleClearHistory}
              className="group relative mr-1 flex items-center justify-center h-[38px] sm:h-[46px] px-3 sm:px-4 text-xs sm:text-sm font-medium text-red-400/85 hover:text-red-300 rounded-full bg-red-500/[0.08] hover:bg-red-500/18 border border-red-500/25 hover:border-red-500/40 shadow-[inset_0_1px_0_0_rgba(255,120,120,0.18),0_8px_24px_rgba(0,0,0,0.65)] transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
              title="Clear History"
            >
              <div className="relative z-10 flex items-center gap-1.5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 will-change-transform transform-gpu">
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                <span>Clear</span>
              </div>
            </button>
          )}
          <button
            onClick={prevPage}
            disabled={!showLeft}
            className={cn(
              "group flex items-center justify-center w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none",
              showLeft
                ? "hover:bg-white/15 cursor-pointer text-white"
                : "text-white/25 cursor-not-allowed pointer-events-none"
            )}
            aria-label="Previous page"
          >
            <ChevronLeft
              className={cn(
                "w-5 h-5 sm:w-7 sm:h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu",
                showLeft ? "group-hover:scale-125 text-white" : "text-white/25"
              )}
            />
          </button>
          <button
            onClick={nextPage}
            disabled={!showRight}
            className={cn(
              "group flex items-center justify-center w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none",
              showRight
                ? "hover:bg-white/15 cursor-pointer text-white"
                : "text-white/25 cursor-not-allowed pointer-events-none"
            )}
            aria-label="Next page"
          >
            <ChevronRight
              className={cn(
                "w-5 h-5 sm:w-7 sm:h-7 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu",
                showRight ? "group-hover:scale-125 text-white" : "text-white/25"
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
        <div
          className={cn(
            "grid gap-x-3 sm:gap-x-5 md:gap-x-7 gap-y-2.5 sm:gap-y-4 md:gap-y-5 w-full h-full min-h-0",
            rowsPerPage === 1 ? "grid-rows-1" : "grid-rows-2",
            "grid-cols-2 sm:grid-cols-3 md:grid-cols-6 xl:grid-cols-8",
            "md:max-h-[calc((100vw-64px)*0.54)] xl:max-h-[calc((100vw-64px)*0.45)]"
          )}
        >
          {loading
            ? Array.from({ length: itemsPerPage }).map((_, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 sm:gap-2 h-full min-h-0 w-full">
                  <div className="w-full flex-1 min-h-0 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                  <div className="flex flex-col px-1 shrink-0 gap-1">
                    <div className="h-3.5 sm:h-4 w-3/4 rounded bg-white/5 animate-pulse" />
                    <div className="h-3 sm:h-3.5 w-1/3 rounded bg-white/5 animate-pulse" />
                  </div>
                </div>
              ))
            : (
              <>
                {visibleItems.map((item) => (
                  <MediaCard
                    key={`${item.media_type || effectiveMediaType}-${item.id}`}
                    item={item}
                    className="w-full"
                    onRemove={
                      effectiveMediaType === "history"
                        ? () => handleRemoveHistoryItem(item)
                        : undefined
                    }
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
              </>
            )}
        </div>
      </div>
    </div>
  );
}
