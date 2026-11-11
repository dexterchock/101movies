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

export function getGridColsForWidth(width: number): number {
  if (width >= 1280) return 8;
  if (width >= 768) return 6;
  if (width >= 640) return 3;
  return 2;
}

export function getGridRowsForHeight(height: number): number {
  return height < 500 ? 1 : 2;
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
