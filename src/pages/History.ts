import { createMediaCard } from "../components/MediaCard";
import { icons } from "../icons";
import { MediaItem } from "../types";
import {
  GRID_COLS_CLASS,
  GRID_ROWS_CLASS,
  appendGridPlaceholders,
  attachHorizontalSwipe,
  clearWatchHistory,
  cn,
  escapeHtml,
  loadWatchHistory,
  observeResponsiveGrid,
  removeFromWatchHistory,
  resolveMediaItemType,
} from "../utils";
import type { ViewCleanup } from "./Home";

type HistoryFilter = "all" | "movie" | "tv";

const FILTER_OPTIONS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "Shows" },
];

export function mount(container: HTMLElement): ViewCleanup {
  const ac = new AbortController();
  const { signal } = ac;

  let history: MediaItem[] = loadWatchHistory();
  let filterType: HistoryFilter = (() => {
    try {
      const saved = sessionStorage.getItem("history_filter_type");
      if (saved === "movie" || saved === "tv") return saved;
    } catch {}
    return "all";
  })();

  const getStorageKey = () => `history_page_${filterType}`;

  const readSavedPage = (): number => {
    try {
      const saved = sessionStorage.getItem(getStorageKey());
      const parsed = saved ? parseInt(saved, 10) : 0;
      return Number.isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  };

  let page = readSavedPage();

  let gridState = observeResponsiveGrid(
    false,
    (next) => {
      gridState = next;
      updateFilterToggle();
      renderStage();
    },
    signal
  );

  // Build static shell
  const root = document.createElement("div");
  root.className = "browse-page";

  const topBar = document.createElement("div");
  topBar.className = "top-bar top-bar--single-row";

  // Left: All / Movies / Shows Filter Toggle
  const filterGroup = document.createElement("div");
  filterGroup.className = "capsule-group top-bar-left";
  filterGroup.setAttribute("role", "tablist");
  filterGroup.setAttribute("aria-label", "History Filter");

  const filterIndicator = document.createElement("div");
  filterIndicator.className = "capsule-indicator";
  filterGroup.appendChild(filterIndicator);

  const filterBtns = new Map<HistoryFilter, HTMLButtonElement>();
  FILTER_OPTIONS.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "capsule-btn";
    btn.setAttribute("role", "tab");
    btn.tabIndex = 0;
    btn.innerHTML = `<span class="capsule-btn-label">${escapeHtml(opt.label)}</span>`;
    btn.addEventListener(
      "click",
      () => {
        if (filterType === opt.id) return;
        filterType = opt.id;
        try {
          sessionStorage.setItem("history_filter_type", filterType);
        } catch {}
        page = readSavedPage();
        updateFilterToggle();
        renderStage();
      },
      { signal }
    );
    filterBtns.set(opt.id, btn);
    filterGroup.appendChild(btn);
  });

  // Right: Clear History + Pagination Arrows
  const rightWrap = document.createElement("div");
  rightWrap.className = "top-bar-right";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "clear-history-btn";
  clearBtn.title = "Clear History";
  clearBtn.tabIndex = 0;
  clearBtn.innerHTML = `<span class="clear-history-btn-inner">${icons.x("", 15, 2)}<span>Clear</span></span>`;
  clearBtn.addEventListener(
    "click",
    () => {
      clearWatchHistory();
      history = [];
      page = 0;
      try {
        sessionStorage.removeItem("history_page_all");
        sessionStorage.removeItem("history_page_movie");
        sessionStorage.removeItem("history_page_tv");
      } catch {}
      syncClearButton();
      renderStage();
    },
    { signal }
  );

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
  topBar.append(filterGroup, rightWrap);

  const stage = document.createElement("div");
  stage.className = "browse-stage";

  root.append(topBar, stage);
  container.replaceChildren(root);

  let gridRenderAbort: AbortController | null = null;

  function syncClearButton() {
    if (history.length > 0) {
      if (!clearBtn.parentElement) {
        rightWrap.insertBefore(clearBtn, prevBtn);
      }
    } else if (clearBtn.parentElement) {
      clearBtn.remove();
    }
  }

  function updateFilterToggle() {
    const tabW = gridState.isMobileView ? 58 : 84;
    const activeIdx = Math.max(
      0,
      FILTER_OPTIONS.findIndex((opt) => opt.id === filterType)
    );
    filterIndicator.style.width = `${tabW}px`;
    filterIndicator.style.transform = `translate3d(${activeIdx * (tabW + 4)}px, 0, 0)`;

    FILTER_OPTIONS.forEach((opt) => {
      const btn = filterBtns.get(opt.id);
      if (!btn) return;
      const active = opt.id === filterType;
      btn.style.width = `${tabW}px`;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
  }

  function getFilteredItems(): MediaItem[] {
    return filterType === "all"
      ? history
      : history.filter((item) => resolveMediaItemType(item) === filterType);
  }

  function setPage(nextPageVal: number) {
    page = nextPageVal;
    try {
      sessionStorage.setItem(getStorageKey(), String(nextPageVal));
    } catch {}
    renderStage();
  }

  const prevPage = () => {
    if (page > 0) setPage(page - 1);
  };

  const nextPage = () => {
    const filteredItems = getFilteredItems();
    const itemsPerPage = gridState.colsPerRow * gridState.rowsPerPage;
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    if (page < totalPages - 1) setPage(page + 1);
  };

  prevBtn.addEventListener("click", prevPage, { signal });
  nextBtn.addEventListener("click", nextPage, { signal });
  attachHorizontalSwipe(stage, nextPage, prevPage, signal);

  function renderStage() {
    if (signal.aborted) return;
    if (gridRenderAbort) {
      gridRenderAbort.abort();
      gridRenderAbort = null;
    }

    syncClearButton();

    const filteredItems = getFilteredItems();
    const itemsPerPage = gridState.colsPerRow * gridState.rowsPerPage;
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    if (page >= totalPages && totalPages > 0) {
      page = Math.max(0, totalPages - 1);
      try {
        sessionStorage.setItem(getStorageKey(), String(page));
      } catch {}
    } else if (totalPages === 0 && page !== 0) {
      page = 0;
    }

    prevBtn.disabled = page <= 0;
    nextBtn.disabled = page >= totalPages - 1;

    if (filteredItems.length === 0) {
      const emptyWrap = document.createElement("div");
      emptyWrap.className = "empty-state";

      const titleText =
        history.length === 0
          ? "No watch history yet"
          : filterType === "tv"
          ? "No shows in watch history"
          : "No movies in watch history";

      const descText =
        history.length === 0
          ? "Start watching a movie or show to pick up right where you left off."
          : "Try switching the filter tab or watching more titles.";

      emptyWrap.innerHTML = `<p class="empty-state-title">${escapeHtml(
        titleText
      )}</p><p class="empty-state-desc">${escapeHtml(descText)}</p>`;
      stage.replaceChildren(emptyWrap);
      return;
    }

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
    const visibleItems = filteredItems.slice(
      page * itemsPerPage,
      (page + 1) * itemsPerPage
    );
    const placeholderCount = Math.max(0, itemsPerPage - visibleItems.length);

    const frag = document.createDocumentFragment();
    visibleItems.forEach((item) => {
      frag.appendChild(
        createMediaCard({
          item,
          signal: gridRenderAbort!.signal,
          onRemove: () => {
            history = removeFromWatchHistory(history, item);
            renderStage();
          },
        })
      );
    });
    appendGridPlaceholders(frag, placeholderCount);
    grid.appendChild(frag);
    stage.replaceChildren(grid);
  }

  updateFilterToggle();
  renderStage();

  return {
    destroy() {
      ac.abort();
      gridRenderAbort?.abort();
      container.replaceChildren();
    },
  };
}
