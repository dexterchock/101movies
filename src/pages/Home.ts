import { api } from "../api";
import { createMediaCard } from "../components/MediaCard";
import { getLocalizedCategories, t } from "../i18n";
import { icons } from "../icons";
import { MediaItem, normalizeCategoryId } from "../types";
import {
  GRID_COLS_CLASS,
  GRID_ROWS_CLASS,
  appendGridPlaceholders,
  attachHorizontalSwipe,
  attachWheelPagination,
  cn,
  createPillTrack,
  observeResponsiveGrid,
  renderSkeletonCards,
} from "../utils";

export interface ViewCleanup {
  destroy: () => void;
}

const CATEGORY_PILL_WIDTH_DESKTOP = 84;
const CATEGORY_PILL_WIDTH_MOBILE = 72;

export function mount(container: HTMLElement): ViewCleanup {
  const ac = new AbortController();
  const { signal } = ac;

  const mediaTypes: { id: "movie" | "tv"; label: string }[] = [
    { id: "movie", label: t("type.movies") },
    { id: "tv", label: t("type.shows") },
  ];

  let mediaType: "movie" | "tv" =
    sessionStorage.getItem("trending_media_type") === "tv" ? "tv" : "movie";
  let movieCategory =
    normalizeCategoryId(sessionStorage.getItem("home_movie_category")) || "all";
  let tvCategory =
    normalizeCategoryId(sessionStorage.getItem("home_tv_category")) || "all";

  let trendingMovies: MediaItem[] = api.getCachedTrendingMovies(movieCategory) || [];
  let trendingTV: MediaItem[] = api.getCachedTrendingTV(tvCategory) || [];
  let loadingMovies = !api.getCachedTrendingMovies(movieCategory);
  let loadingTV = !api.getCachedTrendingTV(tvCategory);

  const getStorageKey = () =>
    `trending_page_${mediaType}_${mediaType === "movie" ? movieCategory : tvCategory}`;

  const readSavedPage = () => {
    const saved = sessionStorage.getItem(getStorageKey());
    const parsed = saved ? parseInt(saved, 10) : 0;
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  let page = readSavedPage();
  let gridState = observeResponsiveGrid(
    true,
    (next) => {
      gridState = next;
      updateControlWidths();
      renderGrid();
    },
    signal
  );

  // Build static shell
  const root = document.createElement("div");
  root.className = "browse-page";

  const topBar = document.createElement("div");
  topBar.className = "top-bar";

  // Left: Movies / Shows toggle
  const mediaToggle = document.createElement("div");
  mediaToggle.className = "capsule-group top-bar-left";
  mediaToggle.setAttribute("role", "tablist");
  mediaToggle.setAttribute("aria-label", t("type.aria"));

  const mediaIndicator = document.createElement("div");
  mediaIndicator.className = "capsule-indicator";
  mediaIndicator.setAttribute("aria-hidden", "true");
  mediaToggle.appendChild(mediaIndicator);

  const mediaBtns = new Map<"movie" | "tv", HTMLButtonElement>();
  mediaTypes.forEach((ty) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "capsule-btn";
    btn.setAttribute("role", "tab");
    btn.tabIndex = 0;
    btn.innerHTML = `<span class="capsule-btn-label">${ty.label}</span>`;
    btn.addEventListener(
      "click",
      () => {
        if (mediaType === ty.id) return;
        mediaType = ty.id;
        try {
          sessionStorage.setItem("trending_media_type", mediaType);
        } catch {}
        page = readSavedPage();
        updateMediaToggle();
        categoryTrack.setActive(
          mediaType === "movie" ? movieCategory : tvCategory,
          true
        );
        if (mediaType === "movie" && !moviesRequested) {
          void loadMovies(movieCategory);
        } else if (mediaType === "tv" && !tvRequested) {
          void loadTV(tvCategory);
        } else {
          renderGrid();
        }
      },
      { signal }
    );
    mediaBtns.set(ty.id, btn);
    mediaToggle.appendChild(btn);
  });

  // Center: Category Switcher
  const centerWrap = document.createElement("div");
  centerWrap.className = "top-bar-center";

  const categoryTrack = createPillTrack({
    items: getLocalizedCategories(),
    activeId: mediaType === "movie" ? movieCategory : tvCategory,
    pillWidth: gridState.isMobileView
      ? CATEGORY_PILL_WIDTH_MOBILE
      : CATEGORY_PILL_WIDTH_DESKTOP,
    trackClass: "pill-track--category",
    leftAriaLabel: t("common.scrollCatsLeft"),
    rightAriaLabel: t("common.scrollCatsRight"),
    onSelect: (id) => {
      if (mediaType === "movie") {
        movieCategory = id;
        try {
          sessionStorage.setItem("home_movie_category", id);
        } catch {}
        page = readSavedPage();
        categoryTrack.setActive(id, true);
        loadMovies(id);
      } else {
        tvCategory = id;
        try {
          sessionStorage.setItem("home_tv_category", id);
        } catch {}
        page = readSavedPage();
        categoryTrack.setActive(id, true);
        loadTV(id);
      }
    },
    signal,
  });
  centerWrap.appendChild(categoryTrack.root);

  // Right: Pagination Arrows
  const rightWrap = document.createElement("div");
  rightWrap.className = "top-bar-right";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "page-nav-btn";
  prevBtn.setAttribute("aria-label", t("common.prevPage"));
  prevBtn.innerHTML = icons.chevronLeft("page-nav-icon");

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "page-nav-btn";
  nextBtn.setAttribute("aria-label", t("common.nextPage"));
  nextBtn.innerHTML = icons.chevronRight("page-nav-icon");

  rightWrap.append(prevBtn, nextBtn);
  topBar.append(mediaToggle, centerWrap, rightWrap);

  // Stage & Grid
  const stage = document.createElement("div");
  stage.className = "browse-stage";

  const grid = document.createElement("div");
  stage.appendChild(grid);

  root.append(topBar, stage);
  container.replaceChildren(root);

  let gridRenderAbort: AbortController | null = null;
  let movieFetchAbort: AbortController | null = null;
  let tvFetchAbort: AbortController | null = null;
  let moviesRequested = false;
  let tvRequested = false;
  let inactivePreloadTimer: ReturnType<typeof setTimeout> | null = null;

  const updateMediaToggle = () => {
    const tabW = gridState.isMobileView ? 72 : 88;
    const idx = mediaType === "tv" ? 1 : 0;
    mediaIndicator.style.width = `${tabW}px`;
    mediaIndicator.style.transform = `translate3d(${idx * (tabW + 4)}px, 0, 0)`;
    mediaTypes.forEach((ty) => {
      const btn = mediaBtns.get(ty.id);
      if (!btn) return;
      const active = ty.id === mediaType;
      btn.style.width = `${tabW}px`;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
  };

  const updateControlWidths = () => {
    updateMediaToggle();
    categoryTrack.setPillWidth(
      gridState.isMobileView
        ? CATEGORY_PILL_WIDTH_MOBILE
        : CATEGORY_PILL_WIDTH_DESKTOP,
      false
    );
  };

  const setPage = (nextPageVal: number) => {
    page = nextPageVal;
    try {
      sessionStorage.setItem(getStorageKey(), String(nextPageVal));
    } catch {}
    renderGrid();
  };

  const goPrev = () => {
    if (page > 0) setPage(page - 1);
  };

  const goNext = () => {
    const activeItems = mediaType === "movie" ? trendingMovies : trendingTV;
    const itemsPerPage = gridState.colsPerRow * gridState.rowsPerPage;
    const totalPages = Math.ceil(activeItems.length / itemsPerPage);
    if (page < totalPages - 1) setPage(page + 1);
  };

  prevBtn.addEventListener("click", goPrev, { signal });
  nextBtn.addEventListener("click", goNext, { signal });
  attachHorizontalSwipe(stage, goNext, goPrev, signal);
  attachWheelPagination(root, goNext, goPrev, signal);

  let errorMovies = false;
  let errorTV = false;

  function renderGrid() {
    if (signal.aborted) return;
    if (gridRenderAbort) {
      gridRenderAbort.abort();
      gridRenderAbort = null;
    }

    const activeItems = mediaType === "movie" ? trendingMovies : trendingTV;
    const loading = mediaType === "movie" ? loadingMovies : loadingTV;
    const hasError = mediaType === "movie" ? errorMovies : errorTV;
    const itemsPerPage = gridState.colsPerRow * gridState.rowsPerPage;
    const totalPages = Math.ceil(activeItems.length / itemsPerPage);

    if (page >= totalPages && totalPages > 0) {
      page = Math.max(0, totalPages - 1);
      try {
        sessionStorage.setItem(getStorageKey(), String(page));
      } catch {}
    }

    prevBtn.disabled = loading || page <= 0;
    nextBtn.disabled = loading || page >= totalPages - 1;

    grid.className = cn(
      "media-grid",
      GRID_COLS_CLASS[gridState.colsPerRow] || "grid-cols-6",
      GRID_ROWS_CLASS[gridState.rowsPerPage] || "grid-rows-2"
    );
    grid.style.maxHeight = gridState.maxGridHeight
      ? `${gridState.maxGridHeight}px`
      : "";

    if (loading) {
      renderSkeletonCards(grid, itemsPerPage);
      return;
    }

    if (activeItems.length === 0) {
      const emptyWrap = document.createElement("div");
      emptyWrap.className = "empty-state";
      emptyWrap.style.gridColumn = "1 / -1";
      emptyWrap.innerHTML = hasError
        ? `<p class="empty-state-title">${t("home.errorTitle")}</p><p class="empty-state-desc">${t("home.errorDesc")}</p>`
        : `<p class="empty-state-title">${t("home.emptyTitle")}</p><p class="empty-state-desc">${t("home.emptyDesc")}</p>`;
      grid.replaceChildren(emptyWrap);
      return;
    }

    gridRenderAbort = new AbortController();
    const visibleItems = activeItems.slice(
      page * itemsPerPage,
      (page + 1) * itemsPerPage
    );
    const placeholderCount = Math.max(0, itemsPerPage - visibleItems.length);

    const frag = document.createDocumentFragment();
    visibleItems.forEach((item, index) => {
      frag.appendChild(
        createMediaCard({
          item,
          colsPerRow: gridState.colsPerRow,
          isPriority: index < gridState.colsPerRow,
          signal: gridRenderAbort!.signal,
        })
      );
    });
    appendGridPlaceholders(frag, placeholderCount);
    grid.replaceChildren(frag);
  }

  function loadMovies(cat: string): Promise<void> {
    moviesRequested = true;
    if (movieFetchAbort) {
      movieFetchAbort.abort();
      movieFetchAbort = null;
    }
    errorMovies = false;
    const cached = api.getCachedTrendingMovies(cat);
    if (cached) {
      trendingMovies = cached;
      loadingMovies = false;
      if (mediaType === "movie") renderGrid();
      return Promise.resolve();
    }
    movieFetchAbort = new AbortController();
    const reqSignal = movieFetchAbort.signal;
    trendingMovies = [];
    loadingMovies = true;
    if (mediaType === "movie") renderGrid();

    return api
      .getTrendingMovies(cat, reqSignal)
      .then((data) => {
        if (signal.aborted || reqSignal.aborted) return;
        trendingMovies = data;
        errorMovies = false;
      })
      .catch(() => {
        if (signal.aborted || reqSignal.aborted) return;
        trendingMovies = [];
        errorMovies = true;
      })
      .finally(() => {
        if (!signal.aborted && !reqSignal.aborted) {
          loadingMovies = false;
          if (mediaType === "movie") renderGrid();
        }
      });
  }

  function loadTV(cat: string): Promise<void> {
    tvRequested = true;
    if (tvFetchAbort) {
      tvFetchAbort.abort();
      tvFetchAbort = null;
    }
    errorTV = false;
    const cached = api.getCachedTrendingTV(cat);
    if (cached) {
      trendingTV = cached;
      loadingTV = false;
      if (mediaType === "tv") renderGrid();
      return Promise.resolve();
    }
    tvFetchAbort = new AbortController();
    const reqSignal = tvFetchAbort.signal;
    trendingTV = [];
    loadingTV = true;
    if (mediaType === "tv") renderGrid();

    return api
      .getTrendingTV(cat, reqSignal)
      .then((data) => {
        if (signal.aborted || reqSignal.aborted) return;
        trendingTV = data;
        errorTV = false;
      })
      .catch(() => {
        if (signal.aborted || reqSignal.aborted) return;
        trendingTV = [];
        errorTV = true;
      })
      .finally(() => {
        if (!signal.aborted && !reqSignal.aborted) {
          loadingTV = false;
          if (mediaType === "tv") renderGrid();
        }
      });
  }

  updateControlWidths();
  renderGrid();
  const activeLoad =
    mediaType === "movie"
      ? loadMovies(movieCategory)
      : loadTV(tvCategory);
  void activeLoad.finally(() => {
    if (signal.aborted) return;
    inactivePreloadTimer = setTimeout(() => {
      inactivePreloadTimer = null;
      if (signal.aborted) return;
      if (!tvRequested) void loadTV(tvCategory);
      if (!moviesRequested) void loadMovies(movieCategory);
    }, 150);
  });

  return {
    destroy() {
      ac.abort();
      if (inactivePreloadTimer !== null) {
        clearTimeout(inactivePreloadTimer);
        inactivePreloadTimer = null;
      }
      gridRenderAbort?.abort();
      movieFetchAbort?.abort();
      tvFetchAbort?.abort();
      container.replaceChildren();
    },
  };
}
