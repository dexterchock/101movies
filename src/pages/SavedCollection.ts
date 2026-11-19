import { createMediaCard } from "../components/MediaCard";
import { openSyncModal, type SyncModalController } from "../components/SyncModal";
import { icons } from "../icons";
import { isDeviceSynced, pullSyncState } from "../sync";
import { MediaItem } from "../types";
import {
  GRID_COLS_CLASS,
  GRID_ROWS_CLASS,
  appendGridPlaceholders,
  attachHorizontalSwipe,
  attachWheelPagination,
  cn,
  escapeHtml,
  observeResponsiveGrid,
  resolveMediaItemType,
} from "../utils";
import type { ViewCleanup } from "./Home";

type CollectionFilter = "all" | "movie" | "tv";

const FILTER_OPTIONS: { id: CollectionFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "Shows" },
];

export interface SavedCollectionConfig {
  filterAriaLabel: string;
  storagePrefix: string;
  clearTitle: string;
  removeLabel: string;
  emptyAllTitle: string;
  emptyAllDesc: string;
  emptyFilteredTitle: (filter: "movie" | "tv") => string;
  emptyFilteredDesc: string;
  loadItems: () => MediaItem[];
  clearItems: () => void;
  removeItem: (prev: MediaItem[], item: MediaItem) => MediaItem[];
}

/**
 * Shared grid/filter/pagination view backing both Watch History and Watch Later.
 */
export function mountSavedCollection(
  container: HTMLElement,
  config: SavedCollectionConfig
): ViewCleanup {
  const ac = new AbortController();
  const { signal } = ac;

  let items: MediaItem[] = config.loadItems();
  let filterType: CollectionFilter = (() => {
    try {
      const saved = sessionStorage.getItem(`${config.storagePrefix}_filter_type`);
      if (saved === "movie" || saved === "tv") return saved;
    } catch {}
    return "all";
  })();

  const getStorageKey = () => `${config.storagePrefix}_page_${filterType}`;

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
    true,
    (next) => {
      gridState = next;
      updateFilterToggle();
      renderStage();
    },
    signal
  );

  const root = document.createElement("div");
  root.className = "browse-page";

  const topBar = document.createElement("div");
  topBar.className = "top-bar top-bar--collection";

  const filterGroup = document.createElement("div");
  filterGroup.className = "capsule-group top-bar-left";
  filterGroup.setAttribute("role", "tablist");
  filterGroup.setAttribute("aria-label", config.filterAriaLabel);

  const filterIndicator = document.createElement("div");
  filterIndicator.className = "capsule-indicator";
  filterIndicator.setAttribute("aria-hidden", "true");
  filterGroup.appendChild(filterIndicator);

  const filterBtns = new Map<CollectionFilter, HTMLButtonElement>();
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
          sessionStorage.setItem(`${config.storagePrefix}_filter_type`, filterType);
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

  const rightWrap = document.createElement("div");
  rightWrap.className = "top-bar-right";

  let activeSyncModal: SyncModalController | null = null;
  const syncBtn = document.createElement("button");
  syncBtn.type = "button";
  syncBtn.className = "sync-btn";
  syncBtn.tabIndex = 0;

  const updateSyncButton = () => {
    const synced = isDeviceSynced();
    syncBtn.classList.toggle("is-synced", synced);
    syncBtn.setAttribute(
      "aria-label",
      synced ? "Device sync active" : "Sync across devices"
    );
    syncBtn.innerHTML = synced
      ? `<span class="sync-btn-inner"><span class="sync-btn-dot" aria-hidden="true"></span><span>Synced</span></span>`
      : `<span class="sync-btn-inner">${icons.refreshCw("", 14)}<span>Sync</span></span>`;
  };
  updateSyncButton();

  syncBtn.addEventListener(
    "click",
    () => {
      if (activeSyncModal) return;
      activeSyncModal = openSyncModal(() => {
        activeSyncModal = null;
        updateSyncButton();
        syncBtn.focus({ preventScroll: true });
      });
    },
    { signal }
  );

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "clear-history-btn";
  clearBtn.title = config.clearTitle;
  clearBtn.tabIndex = 0;
  clearBtn.innerHTML = `<span class="clear-history-btn-inner">${icons.x("", 14, 2)}<span>Clear</span></span>`;
  clearBtn.addEventListener(
    "click",
    () => {
      config.clearItems();
      items = [];
      page = 0;
      try {
        sessionStorage.removeItem(`${config.storagePrefix}_page_all`);
        sessionStorage.removeItem(`${config.storagePrefix}_page_movie`);
        sessionStorage.removeItem(`${config.storagePrefix}_page_tv`);
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

  rightWrap.append(syncBtn, prevBtn, nextBtn);
  topBar.append(filterGroup, rightWrap);

  const stage = document.createElement("div");
  stage.className = "browse-stage";

  root.append(topBar, stage);
  container.replaceChildren(root);

  let gridRenderAbort: AbortController | null = null;

  function syncClearButton() {
    if (items.length > 0) {
      if (!clearBtn.parentElement) {
        rightWrap.insertBefore(clearBtn, prevBtn);
      }
    } else if (clearBtn.parentElement) {
      clearBtn.remove();
    }
  }

  function updateFilterToggle() {
    const winW = typeof window !== "undefined" ? window.innerWidth : 1280;
    const tabW = winW < 520 ? 58 : winW < 768 ? 72 : 84;
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
      ? items
      : items.filter((item) => resolveMediaItemType(item) === filterType);
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
  attachWheelPagination(root, nextPage, prevPage, signal);

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
        items.length === 0
          ? config.emptyAllTitle
          : config.emptyFilteredTitle(filterType === "tv" ? "tv" : "movie");

      const descText =
        items.length === 0 ? config.emptyAllDesc : config.emptyFilteredDesc;

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
    visibleItems.forEach((item, index) => {
      frag.appendChild(
        createMediaCard({
          item,
          colsPerRow: gridState.colsPerRow,
          isPriority: index < gridState.colsPerRow,
          signal: gridRenderAbort!.signal,
          removeLabel: config.removeLabel,
          onRemove: () => {
            items = config.removeItem(items, item);
            renderStage();
          },
        })
      );
    });
    appendGridPlaceholders(frag, placeholderCount);
    grid.appendChild(frag);
    stage.replaceChildren(grid);
  }

  window.addEventListener(
    "sync-state-updated",
    () => {
      if (signal.aborted) return;
      items = config.loadItems();
      updateSyncButton();
      renderStage();
    },
    { signal }
  );
  window.addEventListener("resize", updateFilterToggle, { signal });

  updateFilterToggle();
  renderStage();
  void pullSyncState();

  return {
    destroy() {
      activeSyncModal?.destroy();
      activeSyncModal = null;
      ac.abort();
      gridRenderAbort?.abort();
      container.replaceChildren();
    },
  };
}
