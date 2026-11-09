import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
