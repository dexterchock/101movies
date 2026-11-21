import type { MediaItem } from "./types";
import { icons } from "./icons";
import { pushSyncState } from "./sync";

const WATCH_HISTORY_KEY = "watch_history";
const WATCH_LATER_KEY = "watch_later";

export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadStoredMediaList(storageKey: string): MediaItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function clearStoredMediaList(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {}
}

export function loadWatchHistory(): MediaItem[] {
  return loadStoredMediaList(WATCH_HISTORY_KEY);
}

export function clearWatchHistory(): void {
  clearStoredMediaList(WATCH_HISTORY_KEY);
  void pushSyncState({ history: [], historyMode: "replace" });
}

export function loadWatchLater(): MediaItem[] {
  return loadStoredMediaList(WATCH_LATER_KEY);
}

export function clearWatchLater(): void {
  clearStoredMediaList(WATCH_LATER_KEY);
  void pushSyncState({ saved: [], savedMode: "replace" });
}

export function isInWatchLater(
  type: "movie" | "tv",
  id: string | number
): boolean {
  const list = loadWatchLater();
  return list.some(
    (item) =>
      String(item.id) === String(id) && resolveMediaItemType(item) === type
  );
}

/**
 * Adds or removes a title from the persistent Watch Later list without
 * creating any Watch History entry. Returns `true` if now saved.
 */
export function toggleWatchLater(item: MediaItem): boolean {
  const targetType = resolveMediaItemType(item);
  const current = loadWatchLater();
  const exists = current.some(
    (entry) =>
      String(entry.id) === String(item.id) &&
      resolveMediaItemType(entry) === targetType
  );

  let updated: MediaItem[];
  if (exists) {
    updated = current.filter(
      (entry) =>
        !(
          String(entry.id) === String(item.id) &&
          resolveMediaItemType(entry) === targetType
        )
    );
  } else {
    const cleanEntry: MediaItem = {
      id: item.id,
      title: item.title,
      name: item.name,
      en_title: item.en_title,
      zh_title: item.zh_title,
      is_chinese_origin: item.is_chinese_origin,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      overview: item.overview || "",
      vote_average: item.vote_average || 0,
      media_type: targetType,
      release_date: item.release_date,
      first_air_date: item.first_air_date,
    };
    updated = [cleanEntry, ...current].slice(0, 60);
  }

  try {
    if (updated.length > 0) {
      localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(updated));
    } else {
      localStorage.removeItem(WATCH_LATER_KEY);
    }
  } catch {}

  void pushSyncState({ saved: updated, savedMode: "replace" });

  return !exists;
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

export interface ResponsiveGridState {
  colsPerRow: number;
  rowsPerPage: number;
  maxGridHeight?: number;
  isMobileView: boolean;
}

let safeAreaProbeEl: HTMLDivElement | null = null;

export function isIosStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (window.navigator as { standalone?: boolean }).standalone === true;
}

/** Sync `--app-height` and `html.ios-standalone` to bypass WebKit's standalone `viewport-fit=cover` bottom truncation bug. */
export function syncIosStandaloneViewport(): number | null {
  if (typeof document === "undefined") return null;
  const docEl = document.documentElement;
  if (!isIosStandalone()) {
    docEl.classList.remove("ios-standalone");
    docEl.style.removeProperty("--app-height");
    return null;
  }

  docEl.classList.add("ios-standalone");
  const sw = window.screen?.width ?? 0;
  const sh = window.screen?.height ?? 0;
  const iw = window.innerWidth;
  const minDim = Math.min(sw, sh);
  const maxDim = Math.max(sw, sh);

  let expectedH: number | null = null;
  if (minDim > 0 && Math.abs(iw - minDim) <= 4) {
    expectedH = maxDim;
  } else if (maxDim > 0 && Math.abs(iw - maxDim) <= 4) {
    expectedH = minDim;
  }

  if (!expectedH || !Number.isFinite(expectedH)) {
    docEl.style.removeProperty("--app-height");
    return null;
  }

  docEl.style.setProperty("--app-height", `${expectedH}px`);
  return expectedH;
}

function getSafeAreaVerticalInset(viewportWidth: number): number {
  if (typeof document === "undefined" || !document.body) return 0;
  try {
    if (!safeAreaProbeEl || !document.body.contains(safeAreaProbeEl)) {
      safeAreaProbeEl = document.createElement("div");
      safeAreaProbeEl.className = "safe-area-probe";
      safeAreaProbeEl.setAttribute("aria-hidden", "true");
      document.body.appendChild(safeAreaProbeEl);
    }
    const cs = window.getComputedStyle(safeAreaProbeEl);
    const top = parseFloat(cs.paddingTop) || 0;
    const bottom = parseFloat(cs.paddingBottom) || 0;
    const extraTop = top + (isIosStandalone() && viewportWidth < 640 ? 18 : 0);
    const bottomThreshold =
      viewportWidth >= 768 ? 30 : viewportWidth >= 640 ? 26 : 22;
    const extraBottom = Math.max(0, bottom - bottomThreshold);
    const total = extraTop + extraBottom;
    return Number.isFinite(total) && total > 0 ? total : 0;
  } catch {
    return 0;
  }
}

export function getResponsiveGridState(twoRowMobileHeader = false): ResponsiveGridState {
  const w = typeof window !== "undefined" ? window.innerWidth : 1280;
  const standaloneH = syncIosStandaloneViewport();
  const rawH =
    standaloneH ?? (typeof window !== "undefined" ? window.innerHeight : 720);
  const h = Math.max(320, rawH - getSafeAreaVerticalInset(w));
  const layout = getGridLayout(w, h, twoRowMobileHeader);
  return {
    colsPerRow: layout.cols,
    rowsPerPage: layout.rows,
    maxGridHeight: layout.maxGridHeight,
    isMobileView: w < 640,
  };
}

export function observeResponsiveGrid(
  twoRowMobileHeader: boolean,
  onChange: (state: ResponsiveGridState) => void,
  signal: AbortSignal
): ResponsiveGridState {
  let current = getResponsiveGridState(twoRowMobileHeader);
  let orientTimer: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;
  const applyResize = () => {
    rafId = null;
    if (signal.aborted) return;
    const next = getResponsiveGridState(twoRowMobileHeader);
    if (
      next.colsPerRow !== current.colsPerRow ||
      next.rowsPerPage !== current.rowsPerPage ||
      next.maxGridHeight !== current.maxGridHeight ||
      next.isMobileView !== current.isMobileView
    ) {
      current = next;
      onChange(next);
    }
  };
  const onResize = () => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(applyResize);
  };
  const onOrient = () => {
    onResize();
    if (orientTimer !== null) clearTimeout(orientTimer);
    orientTimer = setTimeout(onResize, 150);
  };
  window.addEventListener("resize", onResize, { signal });
  window.addEventListener("orientationchange", onOrient, { signal });
  signal.addEventListener(
    "abort",
    () => {
      if (orientTimer !== null) {
        clearTimeout(orientTimer);
        orientTimer = null;
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    { once: true }
  );
  return current;
}

function removeFromStoredMediaList(
  storageKey: string,
  prev: MediaItem[],
  itemToRemove: MediaItem
): MediaItem[] {
  const targetType = resolveMediaItemType(itemToRemove);
  const updated = prev.filter(
    (h) => !(h.id === itemToRemove.id && resolveMediaItemType(h) === targetType)
  );
  try {
    if (updated.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } else {
      localStorage.removeItem(storageKey);
    }
  } catch {}
  return updated;
}

export function removeFromWatchHistory(
  prev: MediaItem[],
  itemToRemove: MediaItem
): MediaItem[] {
  const updated = removeFromStoredMediaList(WATCH_HISTORY_KEY, prev, itemToRemove);
  void pushSyncState({ history: updated, historyMode: "replace" });
  return updated;
}

export function removeFromWatchLater(
  prev: MediaItem[],
  itemToRemove: MediaItem
): MediaItem[] {
  const updated = removeFromStoredMediaList(WATCH_LATER_KEY, prev, itemToRemove);
  void pushSyncState({ saved: updated, savedMode: "replace" });
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
    try {
      if (typeof el.scrollTo === "function") {
        el.scrollTo(targetLeft, 0);
        return;
      }
    } catch {}
  }

  try {
    el.scrollLeft = targetLeft;
  } catch {}
}

/**
 * Builds skeleton loading cards inside a grid container.
 */
export function renderSkeletonCards(grid: HTMLElement, count: number): void {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const card = document.createElement("div");
    card.className = "media-card";
    card.innerHTML = `
      <div class="skeleton-poster animate-pulse"></div>
      <div class="media-card-meta" style="gap: 4px;">
        <div class="skeleton-title animate-pulse"></div>
        <div class="skeleton-year animate-pulse"></div>
      </div>
    `;
    frag.appendChild(card);
  }
  grid.replaceChildren(frag);
}

/**
 * Appends invisible placeholder slots so partial rows stay evenly sized.
 */
export function appendGridPlaceholders(frag: DocumentFragment, count: number): void {
  for (let i = 0; i < count; i++) {
    const ph = document.createElement("div");
    ph.className = "media-card-placeholder";
    ph.setAttribute("aria-hidden", "true");
    ph.innerHTML = `
      <div class="media-card-poster" style="border:0;background:transparent;"></div>
      <div class="media-card-meta">
        <span class="media-card-title">&nbsp;</span>
        <span class="media-card-year">&nbsp;</span>
      </div>
    `;
    frag.appendChild(ph);
  }
}

/**
 * Binds horizontal touch swipe navigation to a stage element.
 */
export function attachHorizontalSwipe(
  el: HTMLElement,
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  signal: AbortSignal
): void {
  let startX: number | null = null;
  let startY: number | null = null;

  el.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true, signal }
  );

  el.addEventListener(
    "touchend",
    (e: TouchEvent) => {
      if (startX === null || startY === null) return;
      const deltaX = e.changedTouches[0].clientX - startX;
      const deltaY = e.changedTouches[0].clientY - startY;
      startX = null;
      startY = null;

      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0) onSwipeLeft();
        else onSwipeRight();
      }
    },
    { passive: true, signal }
  );
}

/**
 * Binds mouse wheel pagination to a browse page element (scroll down -> next page, scroll up -> previous page).
 */
export function attachWheelPagination(
  el: HTMLElement,
  onNext: () => void,
  onPrev: () => void,
  signal: AbortSignal
): void {
  let lastWheelTime = 0;
  const COOLDOWN_MS = 280;

  el.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest && target.closest(".pill-track, .modal-backdrop")) {
        return;
      }
      if (Math.abs(e.deltaY) < 15 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
        return;
      }
      const now = Date.now();
      if (now - lastWheelTime < COOLDOWN_MS) return;
      lastWheelTime = now;

      if (e.deltaY > 0) {
        onNext();
      } else {
        onPrev();
      }
    },
    { passive: true, signal }
  );
}

export interface PillTrackItem {
  id: string;
  label: string;
}

export interface PillTrackController {
  root: HTMLElement;
  setActive: (id: string, smooth?: boolean) => void;
  setPillWidth: (width: number, smooth?: boolean) => void;
  scrollByDirection: (direction: -1 | 1) => void;
}

/**
 * Creates a reusable draggable, wheel-scrollable, arrow-navigable pill switcher
 * with an animated white sliding indicator.
 */
export function createPillTrack(opts: {
  items: PillTrackItem[];
  activeId: string;
  pillWidth: number;
  pillGap?: number;
  trackClass: string;
  leftAriaLabel: string;
  rightAriaLabel: string;
  tabularNums?: boolean;
  fixedVisibleCount?: number;
  onSelect: (id: string) => void;
  signal: AbortSignal;
}): PillTrackController {
  const pillGap = opts.pillGap ?? 4;
  let pillWidth = opts.pillWidth;
  let activeId = opts.activeId;
  let isDragging = false;
  let hasDragged = false;
  let startX = 0;
  let scrollLeftStart = 0;

  const root = document.createElement("div");
  root.className = "pill-switcher";

  const leftBtn = document.createElement("button");
  leftBtn.type = "button";
  leftBtn.className = "pill-arrow-btn";
  leftBtn.setAttribute("aria-label", opts.leftAriaLabel);
  leftBtn.innerHTML = icons.chevronLeft("pill-arrow-icon");

  const track = document.createElement("div");
  track.className = `pill-track no-scrollbar ${opts.trackClass}`;

  const inner = document.createElement("div");
  inner.className = "pill-track-inner";

  const indicator = document.createElement("div");
  indicator.className = "pill-indicator";
  indicator.setAttribute("aria-hidden", "true");
  indicator.style.width = `${pillWidth}px`;
  inner.appendChild(indicator);

  const buttons = new Map<string, HTMLButtonElement>();
  opts.items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = cn("pill-btn", opts.tabularNums && "tabular-nums");
    btn.style.width = `${pillWidth}px`;
    btn.tabIndex = 0;
    btn.innerHTML = `<span class="pill-btn-label">${escapeHtml(item.label)}</span>`;
    btn.addEventListener(
      "click",
      () => {
        if (!hasDragged) {
          opts.onSelect(item.id);
        }
      },
      { signal: opts.signal }
    );
    buttons.set(item.id, btn);
    inner.appendChild(btn);
  });

  const rightBtn = document.createElement("button");
  rightBtn.type = "button";
  rightBtn.className = "pill-arrow-btn";
  rightBtn.setAttribute("aria-label", opts.rightAriaLabel);
  rightBtn.innerHTML = icons.chevronRight("pill-arrow-icon");

  track.appendChild(inner);
  root.append(leftBtn, track, rightBtn);

  const updateScrollButtons = () => {
    if (track.clientWidth <= 0) return;
    const canScroll = track.scrollWidth > track.clientWidth + 4;
    leftBtn.style.display = canScroll ? "" : "none";
    rightBtn.style.display = canScroll ? "" : "none";
    leftBtn.disabled = !canScroll || track.scrollLeft <= 4;
    rightBtn.disabled =
      !canScroll || track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
  };

  const getActiveIndex = () => {
    const idx = opts.items.findIndex((i) => i.id === activeId);
    return idx >= 0 ? idx : 0;
  };

  const updateVisualState = () => {
    const idx = getActiveIndex();
    indicator.style.width = `${pillWidth}px`;
    indicator.style.transform = `translate3d(${idx * (pillWidth + pillGap)}px, 0, 0)`;
    opts.items.forEach((item) => {
      const btn = buttons.get(item.id);
      if (!btn) return;
      const isSelected = item.id === activeId;
      btn.classList.toggle("is-active", isSelected);
      btn.setAttribute("aria-pressed", String(isSelected));
      btn.style.width = `${pillWidth}px`;
    });
  };

  const centerTrack = (smooth: boolean) => {
    if (opts.items.length === 0) return;
    const stride = pillWidth + pillGap;
    const activeIdx = getActiveIndex();
    let startIdx: number;
    if (opts.fixedVisibleCount) {
      const visiblePills = track.clientWidth >= 180 ? opts.fixedVisibleCount : 1;
      startIdx =
        visiblePills === 3
          ? Math.max(0, Math.min(opts.items.length - 3, activeIdx - 1))
          : activeIdx;
    } else {
      const visiblePills = Math.max(1, Math.round(track.clientWidth / stride));
      const half = Math.floor(visiblePills / 2);
      startIdx = Math.max(
        0,
        Math.min(opts.items.length - visiblePills, activeIdx - half)
      );
    }
    safeScrollTo(track, startIdx * stride, smooth);
    updateScrollButtons();
  };

  const scrollByDirection = (direction: -1 | 1) => {
    const stride = pillWidth + pillGap;
    const visiblePills = opts.fixedVisibleCount
      ? track.clientWidth >= 180
        ? opts.fixedVisibleCount
        : 1
      : Math.max(1, Math.round(track.clientWidth / stride));

    if (visiblePills <= 1) {
      const nextIndex = Math.max(
        0,
        Math.min(opts.items.length - 1, getActiveIndex() + direction)
      );
      opts.onSelect(opts.items[nextIndex].id);
      return;
    }

    const maxIdx = Math.max(0, opts.items.length - visiblePills);
    const currentIdx = Math.round(track.scrollLeft / stride);
    const step = Math.max(1, visiblePills - 1);
    const nextIdx = Math.max(0, Math.min(maxIdx, currentIdx + direction * step));
    const targetLeft =
      nextIdx >= maxIdx
        ? track.scrollWidth - track.clientWidth
        : nextIdx <= 0
          ? 0
          : nextIdx * stride;
    safeScrollTo(track, targetLeft, true);
  };

  leftBtn.addEventListener("click", () => scrollByDirection(-1), {
    signal: opts.signal,
  });
  rightBtn.addEventListener("click", () => scrollByDirection(1), {
    signal: opts.signal,
  });

  track.addEventListener(
    "mousedown",
    (e: MouseEvent) => {
      isDragging = true;
      hasDragged = false;
      startX = e.pageX - track.offsetLeft;
      scrollLeftStart = track.scrollLeft;
    },
    { signal: opts.signal }
  );

  track.addEventListener(
    "mousemove",
    (e: MouseEvent) => {
      if (!isDragging) return;
      const x = e.pageX - track.offsetLeft;
      const walk = x - startX;
      if (Math.abs(walk) > 5) {
        hasDragged = true;
        e.preventDefault();
        track.scrollLeft = scrollLeftStart - walk * 1.25;
      }
    },
    { signal: opts.signal }
  );

  const stopDrag = () => {
    isDragging = false;
  };
  track.addEventListener("mouseup", stopDrag, { signal: opts.signal });
  track.addEventListener("mouseleave", stopDrag, { signal: opts.signal });

  track.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        track.scrollLeft += e.deltaY;
      }
    },
    { passive: true, signal: opts.signal }
  );

  track.addEventListener("scroll", updateScrollButtons, {
    passive: true,
    signal: opts.signal,
  });

  let lastTrackWidth = track.clientWidth;
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      if (track.clientWidth !== lastTrackWidth) {
        lastTrackWidth = track.clientWidth;
        centerTrack(false);
      }
    });
    ro.observe(track);
    opts.signal.addEventListener("abort", () => ro.disconnect(), { once: true });
  } else {
    window.addEventListener("resize", () => centerTrack(false), {
      signal: opts.signal,
    });
  }

  updateVisualState();
  requestAnimationFrame(() => centerTrack(false));

  return {
    root,
    setActive(id: string, smooth = true) {
      activeId = id;
      updateVisualState();
      centerTrack(smooth);
    },
    setPillWidth(width: number, smooth = false) {
      if (pillWidth === width) return;
      pillWidth = width;
      updateVisualState();
      centerTrack(smooth);
    },
    scrollByDirection,
  };
}
