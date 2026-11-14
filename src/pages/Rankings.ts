import { api } from "../api";
import { createMediaCard } from "../components/MediaCard";
import { MEDIA_CATEGORIES, MediaItem, normalizeCategoryId } from "../types";
import {
  GRID_COLS_CLASS,
  GRID_ROWS_CLASS,
  appendGridPlaceholders,
  attachHorizontalSwipe,
  cn,
  createPillTrack,
  observeResponsiveGrid,
  renderSkeletonCards,
} from "../utils";
import type { ViewCleanup } from "./Home";

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

const YEAR_PILL_WIDTH_DESKTOP = 64;
const YEAR_PILL_WIDTH_MOBILE = 54;
const GENRE_PILL_WIDTH_DESKTOP = 84;
const GENRE_PILL_WIDTH_MOBILE = 72;

export function mount(container: HTMLElement): ViewCleanup {
  const ac = new AbortController();
  const { signal } = ac;

  let mediaType: "movie" | "tv" =
    sessionStorage.getItem("rankings_media_type") === "tv" ? "tv" : "movie";
  let genre =
    normalizeCategoryId(sessionStorage.getItem("rankings_genre")) || "all";
  if (!MEDIA_CATEGORIES.some((g) => g.id === genre)) genre = "all";

  const savedYearRaw = sessionStorage.getItem("rankings_year");
  const savedYearParsed = savedYearRaw ? parseInt(savedYearRaw, 10) : CURRENT_YEAR;
  let year = Number.isNaN(savedYearParsed) ? CURRENT_YEAR : savedYearParsed;

  let items: MediaItem[] = api.getCachedRankings(mediaType, year, genre) || [];
  let loading = !api.getCachedRankings(mediaType, year, genre);

  let gridState = observeResponsiveGrid(
    true,
    (next) => {
      gridState = next;
      updateControlWidths();
      renderStage();
    },
    signal
  );

  const root = document.createElement("div");
  root.className = "browse-page";

  const topBar = document.createElement("div");
  topBar.className = "top-bar";

  // Left: Movies / Shows toggle
  const mediaToggle = document.createElement("div");
  mediaToggle.className = "capsule-group top-bar-left";
  mediaToggle.setAttribute("role", "tablist");
  mediaToggle.setAttribute("aria-label", "Content Type");

  const mediaIndicator = document.createElement("div");
  mediaIndicator.className = "capsule-indicator";
  mediaToggle.appendChild(mediaIndicator);

  const mediaBtns = new Map<"movie" | "tv", HTMLButtonElement>();
  MEDIA_TYPES.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "capsule-btn";
    btn.setAttribute("role", "tab");
    btn.tabIndex = 0;
    btn.innerHTML = `<span class="capsule-btn-label">${t.label}</span>`;
    btn.addEventListener(
      "click",
      () => {
        if (mediaType === t.id) return;
        mediaType = t.id;
        updateMediaToggle();
        loadRankings();
      },
      { signal }
    );
    mediaBtns.set(t.id, btn);
    mediaToggle.appendChild(btn);
  });

  // Center: Genre Switcher
  const centerWrap = document.createElement("div");
  centerWrap.className = "top-bar-center";

  const genreTrack = createPillTrack({
    items: MEDIA_CATEGORIES,
    activeId: genre,
    pillWidth: gridState.isMobileView
      ? GENRE_PILL_WIDTH_MOBILE
      : GENRE_PILL_WIDTH_DESKTOP,
    trackClass: "pill-track--category",
    leftAriaLabel: "Scroll categories left",
    rightAriaLabel: "Scroll categories right",
    onSelect: (id) => {
      if (genre === id) return;
      genre = id;
      genreTrack.setActive(id, true);
      loadRankings();
    },
    signal,
  });
  centerWrap.appendChild(genreTrack.root);

  // Right: Year Switcher
  const rightWrap = document.createElement("div");
  rightWrap.className = "top-bar-right";

  const yearTrack = createPillTrack({
    items: ALL_YEARS.map((y) => ({ id: String(y), label: String(y) })),
    activeId: String(year),
    pillWidth: gridState.isMobileView
      ? YEAR_PILL_WIDTH_MOBILE
      : YEAR_PILL_WIDTH_DESKTOP,
    trackClass: "pill-track--year",
    leftAriaLabel: "Scroll to newer years",
    rightAriaLabel: "Scroll to older years",
    tabularNums: true,
    fixedVisibleCount: 3,
    onSelect: (id) => {
      const nextYear = parseInt(id, 10);
      if (Number.isNaN(nextYear) || year === nextYear) return;
      year = nextYear;
      yearTrack.setActive(id, true);
      loadRankings();
    },
    signal,
  });
  rightWrap.appendChild(yearTrack.root);

  topBar.append(mediaToggle, centerWrap, rightWrap);

  const stage = document.createElement("div");
  stage.className = "browse-stage";
  root.append(topBar, stage);
  container.replaceChildren(root);

  let gridRenderAbort: AbortController | null = null;
  let fetchAbort: AbortController | null = null;

  const updateMediaToggle = () => {
    const tabW = gridState.isMobileView ? 68 : 88;
    const idx = mediaType === "tv" ? 1 : 0;
    mediaIndicator.style.width = `${tabW}px`;
    mediaIndicator.style.transform = `translate3d(${idx * (tabW + 4)}px, 0, 0)`;
    MEDIA_TYPES.forEach((t) => {
      const btn = mediaBtns.get(t.id);
      if (!btn) return;
      const active = t.id === mediaType;
      btn.style.width = `${tabW}px`;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
  };

  const updateControlWidths = () => {
    updateMediaToggle();
    genreTrack.setPillWidth(
      gridState.isMobileView ? GENRE_PILL_WIDTH_MOBILE : GENRE_PILL_WIDTH_DESKTOP,
      false
    );
    yearTrack.setPillWidth(
      gridState.isMobileView ? YEAR_PILL_WIDTH_MOBILE : YEAR_PILL_WIDTH_DESKTOP,
      false
    );
  };

  attachHorizontalSwipe(
    stage,
    () => yearTrack.scrollByDirection(1),
    () => yearTrack.scrollByDirection(-1),
    signal
  );

  function renderStage() {
    if (signal.aborted) return;
    if (gridRenderAbort) {
      gridRenderAbort.abort();
      gridRenderAbort = null;
    }

    const itemsPerPage = gridState.colsPerRow * gridState.rowsPerPage;
    const displayedItems = items.slice(0, itemsPerPage);

    if (!loading && displayedItems.length === 0) {
      stage.innerHTML = `
        <div class="empty-state">
          <p class="empty-state-title">No rankings found for ${year}</p>
          <p class="empty-state-desc">Try swiping to a different year or switching categories.</p>
        </div>
      `;
      return;
    }

    const grid = document.createElement("div");
    grid.className = cn(
      "media-grid",
      GRID_COLS_CLASS[gridState.colsPerRow] || "grid-cols-6",
      GRID_ROWS_CLASS[gridState.rowsPerPage] || "grid-rows-2"
    );
    if (gridState.maxGridHeight) {
      grid.style.maxHeight = `${gridState.maxGridHeight}px`;
    }

    if (loading) {
      renderSkeletonCards(grid, itemsPerPage);
      stage.replaceChildren(grid);
      return;
    }

    gridRenderAbort = new AbortController();
    const frag = document.createDocumentFragment();
    displayedItems.forEach((item, index) => {
      frag.appendChild(
        createMediaCard({
          item,
          rank: index + 1,
          signal: gridRenderAbort!.signal,
        })
      );
    });
    appendGridPlaceholders(frag, Math.max(0, itemsPerPage - displayedItems.length));
    grid.replaceChildren(frag);
    stage.replaceChildren(grid);
  }

  function loadRankings() {
    try {
      sessionStorage.setItem("rankings_media_type", mediaType);
      sessionStorage.setItem("rankings_year", String(year));
      sessionStorage.setItem("rankings_genre", genre);
    } catch {}

    if (fetchAbort) {
      fetchAbort.abort();
      fetchAbort = null;
    }

    const cached = api.getCachedRankings(mediaType, year, genre);
    if (cached) {
      items = cached;
      loading = false;
      renderStage();
      return;
    }

    fetchAbort = new AbortController();
    const reqSignal = fetchAbort.signal;
    loading = true;
    renderStage();

    api
      .getRankings(mediaType, year, genre, reqSignal)
      .then((data) => {
        if (signal.aborted || reqSignal.aborted) return;
        items = data;
      })
      .catch(() => {})
      .finally(() => {
        if (!signal.aborted && !reqSignal.aborted) {
          loading = false;
          renderStage();
        }
      });
  }

  updateControlWidths();
  loadRankings();

  return {
    destroy() {
      ac.abort();
      gridRenderAbort?.abort();
      fetchAbort?.abort();
      container.replaceChildren();
    },
  };
}
