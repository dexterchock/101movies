import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import { api } from "../api";
import { MediaItem, MediaCategoryOption } from "../types";
import { MediaCard } from "../components/MediaCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, safeScrollTo } from "../utils";

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 1970;
const ALL_YEARS = Array.from(
  { length: CURRENT_YEAR - START_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i
);

const MEDIA_TYPES: { id: "movie" | "tv"; label: string }[] = [
  { id: "movie", label: "Movies" },
  { id: "tv", label: "Shows" },
];

const MOVIE_CATEGORIES: MediaCategoryOption[] = [
  { id: "all", label: "All" },
  { id: "28", label: "Action" },
  { id: "878", label: "Sci-Fi" },
  { id: "35", label: "Comedy" },
  { id: "18", label: "Drama" },
  { id: "53", label: "Thriller" },
  { id: "16", label: "Animation" },
  { id: "27", label: "Horror" },
  { id: "12", label: "Adventure" },
];

const TV_CATEGORIES: MediaCategoryOption[] = [
  { id: "all", label: "All" },
  { id: "18", label: "Drama" },
  { id: "10765", label: "Sci-Fi" },
  { id: "10759", label: "Action" },
  { id: "35", label: "Comedy" },
  { id: "80", label: "Crime" },
  { id: "9648", label: "Mystery" },
  { id: "16", label: "Animation" },
];

const YEAR_PILL_WIDTH_DESKTOP = 64;
const YEAR_PILL_WIDTH_MOBILE = 54;
const YEAR_PILL_GAP = 4;

const GENRE_PILL_WIDTH_DESKTOP = 84;
const GENRE_PILL_WIDTH_MOBILE = 72;
const GENRE_PILL_GAP = 4;

let cachedRankingsKey = "";
let cachedRankingsItems: MediaItem[] | null = null;

function getColsForWidth(width: number): number {
  if (width >= 1280) return 8; // 8 columns on modern wide screens
  if (width >= 768) return 6;
  if (width >= 640) return 3;
  return 2;
}

function getRowsForHeight(height: number): number {
  return height < 500 ? 1 : 2;
}

export function Rankings() {
  const [mediaType, setMediaType] = useState<"movie" | "tv">(() => {
    const saved = sessionStorage.getItem("rankings_media_type");
    return saved === "tv" ? "tv" : "movie";
  });
  const [genre, setGenre] = useState<string>(() => {
    return sessionStorage.getItem("rankings_genre") || "all";
  });
  const [year, setYear] = useState<number>(() => {
    const saved = sessionStorage.getItem("rankings_year");
    const parsed = saved ? parseInt(saved, 10) : CURRENT_YEAR;
    return Number.isNaN(parsed) ? CURRENT_YEAR : parsed;
  });

  const activeGenreList =
    mediaType === "movie" ? MOVIE_CATEGORIES : TV_CATEGORIES;
  const validGenre = activeGenreList.some((g) => g.id === genre) ? genre : "all";

  useEffect(() => {
    if (validGenre !== genre) {
      setGenre("all");
    }
  }, [mediaType, validGenre, genre]);

  const currentKey = `${mediaType}_${year}_${validGenre}`;
  const [items, setItems] = useState<MediaItem[]>(() =>
    cachedRankingsKey === currentKey && cachedRankingsItems
      ? cachedRankingsItems
      : []
  );
  const [loading, setLoading] = useState(
    !(cachedRankingsKey === currentKey && cachedRankingsItems)
  );

  // Year track refs & state
  const yearTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Genre track refs & state
  const genreTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingGenreRef = useRef(false);
  const hasDraggedGenreRef = useRef(false);
  const startXGenreRef = useRef(0);
  const scrollLeftGenreStartRef = useRef(0);

  const [canScrollGenreLeft, setCanScrollGenreLeft] = useState(false);
  const [canScrollGenreRight, setCanScrollGenreRight] = useState(true);

  const activeMediaTypeIndex = MEDIA_TYPES.findIndex((c) => c.id === mediaType);
  const activeYearIndex = Math.max(0, ALL_YEARS.indexOf(year));
  const activeGenreIndex = Math.max(
    0,
    activeGenreList.findIndex((g) => g.id === validGenre)
  );

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
    const onResize = () => {
      setColsPerRow(getColsForWidth(window.innerWidth));
      setRowsPerPage(getRowsForHeight(window.innerHeight));
      setIsMobileView(window.innerWidth < 640);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const mediaTypeTabWidth = isMobileView ? 68 : 88;
  const yearPillWidth = isMobileView ? YEAR_PILL_WIDTH_MOBILE : YEAR_PILL_WIDTH_DESKTOP;
  const genrePillWidth = isMobileView ? GENRE_PILL_WIDTH_MOBILE : GENRE_PILL_WIDTH_DESKTOP;

  const updateScrollButtons = useCallback(() => {
    const el = yearTrackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const updateGenreScrollButtons = useCallback(() => {
    const el = genreTrackRef.current;
    if (!el) return;
    setCanScrollGenreLeft(el.scrollLeft > 4);
    setCanScrollGenreRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const centerYearTrack = useCallback(
    (smooth: boolean) => {
      const el = yearTrackRef.current;
      if (!el) return;
      const stride = yearPillWidth + YEAR_PILL_GAP;
      const visiblePills = el.clientWidth >= 180 ? 3 : 1;
      const startIdx =
        visiblePills === 3
          ? Math.max(0, Math.min(ALL_YEARS.length - 3, activeYearIndex - 1))
          : activeYearIndex;
      const targetScroll = startIdx * stride;
      safeScrollTo(el, targetScroll, smooth);
      updateScrollButtons();
    },
    [activeYearIndex, updateScrollButtons, yearPillWidth]
  );

  useEffect(() => {
    const el = yearTrackRef.current;
    if (!el) return;
    const handleResize = () => centerYearTrack(false);
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", handleResize);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateScrollButtons, centerYearTrack]);

  const centerGenreTrack = useCallback(
    (smooth: boolean) => {
      const el = genreTrackRef.current;
      if (!el || activeGenreList.length === 0) return;
      const stride = genrePillWidth + GENRE_PILL_GAP;
      const visiblePills = Math.max(1, Math.round(el.clientWidth / stride));
      const half = Math.floor(visiblePills / 2);
      const startIdx = Math.max(
        0,
        Math.min(activeGenreList.length - visiblePills, activeGenreIndex - half)
      );
      const targetScroll = startIdx * stride;
      safeScrollTo(el, targetScroll, smooth);
      updateGenreScrollButtons();
    },
    [activeGenreList.length, activeGenreIndex, genrePillWidth, updateGenreScrollButtons]
  );

  useEffect(() => {
    const el = genreTrackRef.current;
    if (!el) return;
    const onResize = () => centerGenreTrack(false);
    updateGenreScrollButtons();
    el.addEventListener("scroll", updateGenreScrollButtons, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", updateGenreScrollButtons);
      window.removeEventListener("resize", onResize);
    };
  }, [updateGenreScrollButtons, centerGenreTrack, mediaType]);

  const isInitialYearMountRef = useRef(true);
  const isInitialGenreMountRef = useRef(true);

  useLayoutEffect(() => {
    try {
      if (isInitialYearMountRef.current) {
        isInitialYearMountRef.current = false;
        centerYearTrack(false);
      } else {
        centerYearTrack(true);
      }
    } catch (err) {
      console.warn("centerYearTrack failed in useLayoutEffect:", err);
    }
  }, [centerYearTrack]);

  useLayoutEffect(() => {
    try {
      if (isInitialGenreMountRef.current) {
        isInitialGenreMountRef.current = false;
        centerGenreTrack(false);
      } else {
        centerGenreTrack(true);
      }
    } catch (err) {
      console.warn("centerGenreTrack failed in useLayoutEffect:", err);
    }
  }, [centerGenreTrack]);

  useEffect(() => {
    try {
      sessionStorage.setItem("rankings_media_type", mediaType);
      sessionStorage.setItem("rankings_year", String(year));
      sessionStorage.setItem("rankings_genre", validGenre);
    } catch {}

    const key = `${mediaType}_${year}_${validGenre}`;
    if (cachedRankingsKey === key && cachedRankingsItems) {
      setItems(cachedRankingsItems);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const fetchPromise = api.getRankings(mediaType, year, validGenre);

    fetchPromise
      .then((data) => {
        if (active) {
          cachedRankingsKey = key;
          cachedRankingsItems = data;
          setItems(data);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mediaType, year, validGenre]);

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
    const stride = yearPillWidth + YEAR_PILL_GAP;
    const visiblePills = el.clientWidth >= 180 ? 3 : 1;
    if (visiblePills === 1) {
      const nextIndex = Math.max(
        0,
        Math.min(ALL_YEARS.length - 1, activeYearIndex + direction)
      );
      setYear(ALL_YEARS[nextIndex]);
      return;
    }
    const maxIdx = Math.max(0, ALL_YEARS.length - visiblePills);
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

  const handleGenreMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = genreTrackRef.current;
    if (!el) return;
    isDraggingGenreRef.current = true;
    hasDraggedGenreRef.current = false;
    startXGenreRef.current = e.pageX - el.offsetLeft;
    scrollLeftGenreStartRef.current = el.scrollLeft;
  };

  const handleGenreMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingGenreRef.current) return;
    const el = genreTrackRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXGenreRef.current;
    if (Math.abs(walk) > 5) {
      hasDraggedGenreRef.current = true;
      e.preventDefault();
      el.scrollLeft = scrollLeftGenreStartRef.current - walk * 1.25;
    }
  };

  const stopGenreDragging = () => {
    isDraggingGenreRef.current = false;
  };

  const handleGenreWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = genreTrackRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  const scrollGenresBy = (direction: -1 | 1) => {
    const el = genreTrackRef.current;
    if (!el) return;
    const stride = genrePillWidth + GENRE_PILL_GAP;
    const visiblePills = Math.max(1, Math.round(el.clientWidth / stride));
    if (visiblePills <= 1) {
      const nextIndex = Math.max(
        0,
        Math.min(activeGenreList.length - 1, activeGenreIndex + direction)
      );
      setGenre(activeGenreList[nextIndex].id);
      return;
    }
    const maxIdx = Math.max(0, activeGenreList.length - visiblePills);
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

  // Touch swipe support to change year
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
        scrollYearsBy(1); // Swipe left -> older year
      } else {
        scrollYearsBy(-1); // Swipe right -> newer year
      }
    }
  };

  const itemsPerPage = colsPerRow * rowsPerPage;
  const displayedItems = items.slice(0, itemsPerPage);
  const placeholderCount = !loading
    ? Math.max(0, itemsPerPage - displayedItems.length)
    : 0;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black select-none">
      {/* Responsive Top Control Bar */}
      <div className="shrink-0 relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-2 w-full px-4 sm:px-6 md:px-8 pt-3 sm:pt-4 md:pt-6 pb-2.5 sm:pb-3 md:pb-5 z-40">
        {/* Left: Movies / Shows Capsule Toggle */}
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
          {MEDIA_TYPES.map((cat) => {
            const isActive = mediaType === cat.id;
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

        {/* Center on Desktop/Landscape / Row 2 on Portrait Mobile: Genre Switcher Capsule */}
        <div className="order-3 sm:order-2 w-full sm:w-auto flex justify-center sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          <div className="flex items-center justify-between gap-1 p-0.5 sm:p-1 h-[38px] sm:h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] shrink-0">
            <button
              type="button"
              onClick={() => scrollGenresBy(-1)}
              disabled={!canScrollGenreLeft}
              aria-label="Scroll categories left"
              className={cn(
                "group flex items-center justify-center w-[30px] sm:w-[36px] h-[30px] sm:h-[36px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none shrink-0",
                canScrollGenreLeft
                  ? "hover:bg-white/15 cursor-pointer text-white"
                  : "bg-transparent text-white/25 cursor-not-allowed pointer-events-none"
              )}
            >
              <ChevronLeft
                className={cn(
                  "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu",
                  canScrollGenreLeft
                    ? "group-hover:scale-125 text-white"
                    : "text-white/25"
                )}
              />
            </button>

            <div
              ref={genreTrackRef}
              onMouseDown={handleGenreMouseDown}
              onMouseMove={handleGenreMouseMove}
              onMouseUp={stopGenreDragging}
              onMouseLeave={stopGenreDragging}
              onWheel={handleGenreWheel}
              className="relative overflow-x-auto no-scrollbar select-none cursor-grab active:cursor-grabbing w-[160px] min-[400px]:w-[230px] sm:w-[260px] md:w-[320px] lg:w-[280px] xl:w-[436px] h-[30px] sm:h-[36px] rounded-full"
            >
              <div className="relative flex items-center gap-1 w-max h-[30px] sm:h-[36px]">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-white text-black rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                  style={{
                    width: `${genrePillWidth}px`,
                    transform: `translate3d(${
                      activeGenreIndex * (genrePillWidth + GENRE_PILL_GAP)
                    }px, 0, 0)`,
                  }}
                />

                {activeGenreList.map((cat) => {
                  const isSelected = validGenre === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        if (!hasDraggedGenreRef.current) {
                          setGenre(cat.id);
                        }
                      }}
                      tabIndex={0}
                      style={{ width: `${genrePillWidth}px` }}
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
              onClick={() => scrollGenresBy(1)}
              disabled={!canScrollGenreRight}
              aria-label="Scroll categories right"
              className={cn(
                "group flex items-center justify-center w-[30px] sm:w-[36px] h-[30px] sm:h-[36px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none shrink-0",
                canScrollGenreRight
                  ? "hover:bg-white/15 cursor-pointer text-white"
                  : "bg-transparent text-white/25 cursor-not-allowed pointer-events-none"
              )}
            >
              <ChevronRight
                className={cn(
                  "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu",
                  canScrollGenreRight
                    ? "group-hover:scale-125 text-white"
                    : "text-white/25"
                )}
              />
            </button>
          </div>
        </div>

        {/* Right: Year Switcher Capsule */}
        <div className="order-2 sm:order-3 flex items-center justify-between gap-1 p-0.5 sm:p-1 h-[38px] sm:h-[46px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] shrink-0">
          <button
            type="button"
            onClick={() => scrollYearsBy(-1)}
            disabled={!canScrollLeft}
            aria-label="Scroll to newer years"
            className={cn(
              "group flex items-center justify-center w-[30px] sm:w-[36px] h-[30px] sm:h-[36px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none shrink-0",
              canScrollLeft
                ? "hover:bg-white/15 cursor-pointer text-white"
                : "bg-transparent text-white/25 cursor-not-allowed pointer-events-none"
            )}
          >
            <ChevronLeft
              className={cn(
                "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu",
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
            className="relative overflow-x-auto no-scrollbar select-none cursor-grab active:cursor-grabbing w-[60px] sm:w-[200px] h-[30px] sm:h-[36px] rounded-full"
          >
            <div className="relative flex items-center gap-1 w-max h-[30px] sm:h-[36px]">
              <div
                className="absolute top-0 bottom-0 left-0 bg-white text-black rounded-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                style={{
                  width: `${yearPillWidth}px`,
                  transform: `translate3d(${
                    activeYearIndex * (yearPillWidth + YEAR_PILL_GAP)
                  }px, 0, 0)`,
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
                    style={{ width: `${yearPillWidth}px` }}
                    className={cn(
                      "group relative z-10 flex items-center justify-center h-[30px] sm:h-[36px] text-xs sm:text-sm rounded-full font-medium tracking-wide tabular-nums whitespace-nowrap shrink-0 transition-colors duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer",
                      "focus:outline-none focus-visible:outline-none select-none",
                      isSelected
                        ? "text-black"
                        : "text-white/75 hover:text-white focus:text-white"
                    )}
                  >
                    <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 group-focus:scale-110 will-change-transform transform-gpu">
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
              "group flex items-center justify-center w-[30px] sm:w-[36px] h-[30px] sm:h-[36px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none shrink-0",
              canScrollRight
                ? "hover:bg-white/15 cursor-pointer text-white"
                : "bg-transparent text-white/25 cursor-not-allowed pointer-events-none"
            )}
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu",
                canScrollRight ? "group-hover:scale-125 text-white" : "text-white/25"
              )}
            />
          </button>
        </div>
      </div>

      {/* Viewport Grid (Clears Bottom Nav Pill, Supports Touch Swipe, Adapts to Orientation & Wide Screens) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 min-h-0 w-full px-4 sm:px-6 md:px-8 pb-[74px] sm:pb-[88px] md:pb-[96px] relative z-10"
      >
        {!loading && displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-lg sm:text-xl text-white/70 font-medium mb-2">
              No rankings found for {year}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              Try swiping to a different year or switching categories.
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
                  {displayedItems.map((item, index) => (
                    <MediaCard
                      key={`${mediaType}-${year}-${validGenre}-${item.id}`}
                      item={item}
                      rank={index + 1}
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
                </>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
