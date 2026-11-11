import { useEffect, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MediaItem } from "./types";

const WATCH_HISTORY_KEY = "watch_history";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function loadWatchHistory(): MediaItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(WATCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearWatchHistory(): void {
  try {
    localStorage.removeItem(WATCH_HISTORY_KEY);
  } catch {}
}

export function resolveMediaItemType(item: MediaItem): "movie" | "tv" {
  return item.media_type === "tv" || (!item.media_type && !item.title && item.name)
    ? "tv"
    : "movie";
}

export interface GridLayoutConfig {
  cols: number;
  rows: number;
  maxGridHeight?: number;
}

export const GRID_COLS_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  8: "grid-cols-8",
};

export const GRID_ROWS_CLASS: Record<number, string> = {
  1: "grid-rows-1",
  2: "grid-rows-2",
  3: "grid-rows-3",
};

/**
 * Selects column/row counts and optional vertical max-height cap based on both
 * viewport width and height so poster grids maintain near-2:3 framing and
 * uniform vertical margins on both widescreen and tall displays.
 */
export function getGridLayout(
  width: number,
  height: number,
  twoRowMobileHeader = false
): GridLayoutConfig {
  const px = width >= 768 ? 64 : width >= 640 ? 48 : 32;
  const colGap = width >= 768 ? 28 : width >= 640 ? 20 : 12;
  const rowGap = width >= 768 ? 20 : width >= 640 ? 16 : 10;
  const textH = width >= 640 ? 48 : 38;
  const topBarH = width >= 640 ? 66 : twoRowMobileHeader ? 96 : 50;
  const botClear = width >= 768 ? 78 : width >= 640 ? 74 : 54;
  const py = width >= 768 ? 20 : width >= 640 ? 16 : 12;

  const availH = Math.max(160, height - topBarH - botClear - py * 2);
  const availW = Math.max(240, width - px);

  if (height < 500) {
    const cols = width >= 768 ? 6 : width >= 640 ? 3 : 2;
    return { cols, rows: 1 };
  }

  let candidates: [number, number][];
  if (width >= 1280) candidates = [[8, 2], [6, 2], [5, 2], [6, 3], [5, 3], [4, 3]];
  else if (width >= 768) candidates = [[6, 2], [5, 2], [4, 2], [4, 3], [6, 3], [5, 3]];
  else if (width >= 640) candidates = [[3, 2], [3, 3]];
  else candidates = [[2, 2], [2, 3]];

  let best: { cols: number; rows: number; gridH: number; score: number } | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const [cols, rows] = candidates[i];
    const cardW = (availW - (cols - 1) * colGap) / cols;
    const rawPosterH = (availH - (rows - 1) * rowGap - rows * textH) / rows;
    if (rawPosterH < cardW * 1.15) continue;

    const maxPosterH = cardW * 1.75;
    const posterH = Math.min(maxPosterH, rawPosterH);
    const gridH = rows * (posterH + textH) + (rows - 1) * rowGap;
    const fill = gridH / availH;
    const ratio = posterH / cardW;
    const distortion = Math.abs(ratio - 1.5);
    const gapEach = py + (availH - gridH) / 2;
    const orderBonus =
      (candidates.length - i) * 0.04 + (i === 0 && gapEach <= 34 ? 0.55 : 0);
    const score = fill * 2.2 - distortion * 0.4 + orderBonus;

    if (!best || score > best.score) {
      best = { cols, rows, gridH: Math.round(gridH), score };
    }
  }

  if (!best) {
    const [cols, rows] = candidates[0];
    return { cols, rows };
  }

  return {
    cols: best.cols,
    rows: best.rows,
    maxGridHeight: best.gridH < availH - 2 ? best.gridH : undefined,
  };
}

/**
 * Tracks responsive grid columns, rows, maxHeight cap, and mobile breakpoint
 * on viewport resize across browse views.
 */
export function useResponsiveGrid(twoRowMobileHeader = false) {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") {
      return {
        layout: { cols: 6, rows: 2 } as GridLayoutConfig,
        isMobileView: false,
      };
    }
    return {
      layout: getGridLayout(window.innerWidth, window.innerHeight, twoRowMobileHeader),
      isMobileView: window.innerWidth < 640,
    };
  });

  useEffect(() => {
    const onResize = () => {
      setState({
        layout: getGridLayout(window.innerWidth, window.innerHeight, twoRowMobileHeader),
        isMobileView: window.innerWidth < 640,
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [twoRowMobileHeader]);

  return {
    colsPerRow: state.layout.cols,
    rowsPerPage: state.layout.rows,
    maxGridHeight: state.layout.maxGridHeight,
    isMobileView: state.isMobileView,
  };
}

export function removeFromWatchHistory(
  prev: MediaItem[],
  itemToRemove: MediaItem
): MediaItem[] {
  const targetType = resolveMediaItemType(itemToRemove);
  const updated = prev.filter(
    (h) => !(h.id === itemToRemove.id && resolveMediaItemType(h) === targetType)
  );
  try {
    if (updated.length > 0) {
      localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(updated));
    } else {
      localStorage.removeItem(WATCH_HISTORY_KEY);
    }
  } catch {}
  return updated;
}

/**
 * Safely scrolls an element horizontally, with fallbacks for older Smart TV
 * web engines where Element.prototype.scrollTo is missing or throws when passed options.
 */
export function safeScrollTo(
  el: HTMLElement | null | undefined,
  targetLeft: number,
  smooth = true
) {
  if (!el) return;
  try {
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ left: targetLeft, behavior: smooth ? "smooth" : "auto" });
      return;
    }
  } catch {
    // Fallback if passing dictionary options throws in older browsers
    try {
      if (typeof el.scrollTo === "function") {
        el.scrollTo(targetLeft, 0);
        return;
      }
    } catch {}
  }

  // Universal fallback supported by all browsers
  try {
    el.scrollLeft = targetLeft;
  } catch {}
}
