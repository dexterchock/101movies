import { api } from "../api";
import { createMediaCard } from "../components/MediaCard";
import { icons } from "../icons";
import { MediaItem } from "../types";
import {
  GRID_COLS_CLASS,
  GRID_ROWS_CLASS,
  appendGridPlaceholders,
  attachHorizontalSwipe,
  cn,
  escapeHtml,
  observeResponsiveGrid,
  renderSkeletonCards,
} from "../utils";
import type { ViewCleanup } from "./Home";

let cachedSearchQuery = "";
let cachedSearchResults: MediaItem[] = [];

export function mount(container: HTMLElement): ViewCleanup {
  const ac = new AbortController();
  const { signal } = ac;

  let query = cachedSearchQuery;
  let results: MediaItem[] = cachedSearchResults;
  let loading = false;
  let page = 0;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let searchAbort: AbortController | null = null;
  let gridRenderAbort: AbortController | null = null;

  let gridState = observeResponsiveGrid(
    false,
    (next) => {
      gridState = next;
      renderStage();
    },
    signal
  );

  // Build static shell
  const root = document.createElement("div");
  root.className = "browse-page";

  const topBar = document.createElement("div");
  topBar.className = "top-bar top-bar--single-row";

  const spacer = document.createElement("div");
  spacer.className = "search-spacer";

  const searchBoxWrap = document.createElement("div");
  searchBoxWrap.className = "search-box-wrap";

  const searchBox = document.createElement("div");
  searchBox.className = "search-box";
  searchBox.insertAdjacentHTML("beforeend", icons.search("search-icon"));

  const input = document.createElement("input");
  input.type = "text";
  input.className = "search-input";
  input.placeholder = "Search movies, shows...";
  input.value = query;
  input.tabIndex = 0;
  input.setAttribute("aria-label", "Search movies and shows");

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "search-clear-btn";
  clearBtn.setAttribute("aria-label", "Clear search");
  clearBtn.tabIndex = 0;
  clearBtn.innerHTML = `<span class="search-clear-inner">${icons.x("", 14, 2)}</span>`;

  searchBox.append(input);
  searchBoxWrap.appendChild(searchBox);

  const rightWrap = document.createElement("div");
  rightWrap.className = "top-bar-right";
  rightWrap.style.marginLeft = "auto";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "page-nav-btn";
  prevBtn.setAttribute("aria-label", "Previous page");
  prevBtn.innerHTML = icons.chevronLeft("page-nav-icon");

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "page-nav-btn";
  nextBtn.setAttribute("aria-label", "Next page");
  nextBtn.innerHTML = icons.chevronRight("page-nav-icon");

  rightWrap.append(prevBtn, nextBtn);
  topBar.append(spacer, searchBoxWrap, rightWrap);

  const stage = document.createElement("div");
  stage.className = "browse-stage";

  root.append(topBar, stage);
  container.replaceChildren(root);

  function syncClearButton() {
    if (query.length > 0) {
      if (!clearBtn.parentElement) {
        searchBox.appendChild(clearBtn);
      }
    } else if (clearBtn.parentElement) {
      clearBtn.remove();
    }
  }

  function focusInputWithoutScroll() {
    try {
      input.focus({ preventScroll: true });
    } catch {
      try {
        input.focus();
      } catch {}
    }
  }

  clearBtn.addEventListener(
    "click",
    () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      searchAbort?.abort();
      searchAbort = null;
      cachedSearchQuery = "";
      cachedSearchResults = [];
      query = "";
      results = [];
      loading = false;
      page = 0;
      input.value = "";
      syncClearButton();
      renderStage();
      focusInputWithoutScroll();
    },
    { signal }
  );

  const goPrev = () => {
    if (!loading && page > 0) {
      page -= 1;
      renderStage();
    }
  };

  const goNext = () => {
    const itemsPerPage = gridState.colsPerRow * gridState.rowsPerPage;
    const totalPages = Math.ceil(results.length / itemsPerPage);
    if (!loading && page < totalPages - 1) {
      page += 1;
      renderStage();
    }
  };

  prevBtn.addEventListener("click", goPrev, { signal });
  nextBtn.addEventListener("click", goNext, { signal });
  attachHorizontalSwipe(stage, goNext, goPrev, signal);

  function handleQueryChange(nextVal: string) {
    query = nextVal;
    syncClearButton();

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (searchAbort) {
      searchAbort.abort();
      searchAbort = null;
    }

    const trimmed = query.trim();
    if (trimmed === cachedSearchQuery && cachedSearchResults.length > 0) {
      results = cachedSearchResults;
      loading = false;
      renderStage();
      return;
    }

    page = 0;

    if (trimmed.length === 0) {
      cachedSearchQuery = "";
      cachedSearchResults = [];
      results = [];
      loading = false;
      renderStage();
      return;
    }

    loading = true;
    renderStage();

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (signal.aborted) return;

      const reqAbort = new AbortController();
      searchAbort = reqAbort;
      const reqSignal = reqAbort.signal;

      api
        .search(trimmed, reqSignal)
        .then((data) => {
          if (signal.aborted || reqSignal.aborted) return;
          const filtered = data.filter(
            (item) =>
              item.media_type === "movie" ||
              item.media_type === "tv" ||
              !item.media_type
          );
          cachedSearchQuery = trimmed;
          cachedSearchResults = filtered;
          results = filtered;
        })
        .catch(() => {})
        .finally(() => {
          if (!signal.aborted && !reqSignal.aborted) {
            loading = false;
            renderStage();
          }
        });
    }, 400);
  }

  input.addEventListener(
    "input",
    () => {
      handleQueryChange(input.value);
    },
    { signal }
  );

  function renderStage() {
    if (signal.aborted) return;
    if (gridRenderAbort) {
      gridRenderAbort.abort();
      gridRenderAbort = null;
    }

    syncClearButton();

    const itemsPerPage = gridState.colsPerRow * gridState.rowsPerPage;
    const totalPages = Math.ceil(results.length / itemsPerPage);

    if (page >= totalPages && totalPages > 0) {
      page = Math.max(0, totalPages - 1);
    }

    prevBtn.disabled = loading || page <= 0;
    nextBtn.disabled = loading || page >= totalPages - 1;

    if (loading) {
      const grid = document.createElement("div");
      grid.className = cn(
        "media-grid",
        GRID_COLS_CLASS[gridState.colsPerRow] || "grid-cols-6",
        GRID_ROWS_CLASS[gridState.rowsPerPage] || "grid-rows-2"
      );
      grid.style.maxHeight = gridState.maxGridHeight
        ? `${gridState.maxGridHeight}px`
        : "";
      renderSkeletonCards(grid, itemsPerPage);
      stage.replaceChildren(grid);
      return;
    }

    const visibleResults = results.slice(
      page * itemsPerPage,
      (page + 1) * itemsPerPage
    );

    if (visibleResults.length > 0) {
      const grid = document.createElement("div");
      grid.className = cn(
        "media-grid",
        GRID_COLS_CLASS[gridState.colsPerRow] || "grid-cols-6",
        GRID_ROWS_CLASS[gridState.rowsPerPage] || "grid-rows-2"
      );
      grid.style.maxHeight = gridState.maxGridHeight
        ? `${gridState.maxGridHeight}px`
        : "";

      gridRenderAbort = new AbortController();
      const placeholderCount = Math.max(0, itemsPerPage - visibleResults.length);

      const frag = document.createDocumentFragment();
      visibleResults.forEach((item) => {
        frag.appendChild(
          createMediaCard({
            item,
            signal: gridRenderAbort!.signal,
          })
        );
      });
      appendGridPlaceholders(frag, placeholderCount);
      grid.appendChild(frag);
      stage.replaceChildren(grid);
      return;
    }

    const emptyWrap = document.createElement("div");
    emptyWrap.className = "empty-state";
    const trimmed = query.trim();

    if (trimmed.length > 0) {
      emptyWrap.innerHTML = `<p class="empty-state-title">No movies or shows found for &ldquo;${escapeHtml(
        trimmed
      )}&rdquo;</p><p class="empty-state-desc">Check your spelling or try a different keyword.</p>`;
    } else {
      emptyWrap.innerHTML = `<p class="empty-state-hint">Type to search movies and shows...</p>`;
    }
    stage.replaceChildren(emptyWrap);
  }

  syncClearButton();
  renderStage();

  // Auto-focus empty search input on mount without scrolling container
  if (cachedSearchResults.length === 0) {
    focusInputWithoutScroll();
  }

  return {
    destroy() {
      ac.abort();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      searchAbort?.abort();
      gridRenderAbort?.abort();
      container.replaceChildren();
    },
  };
}
