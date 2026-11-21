import { api } from "../api";
import { icons } from "../icons";
import type { MediaItem } from "../types";
import { cn, escapeHtml, resolveMediaItemType } from "../utils";
import { preloadHlsLibrary } from "./HlsPlayer";

export interface MediaCardOptions {
  item: MediaItem;
  rank?: number;
  className?: string;
  onRemove?: (e: MouseEvent) => void;
  removeLabel?: string;
  colsPerRow?: number;
  isPriority?: boolean;
  signal: AbortSignal;
}

function buildPosterSizes(cols: number): string {
  const c = Math.max(2, Math.round(cols));
  return `(min-width: 768px) calc((100vw - ${64 + (c - 1) * 28}px) / ${c}), (min-width: 640px) calc((100vw - ${48 + (c - 1) * 20}px) / ${c}), calc((100vw - ${32 + (c - 1) * 12}px) / ${c})`;
}

export function createMediaCard(options: MediaCardOptions): HTMLAnchorElement {
  const {
    item,
    rank,
    className,
    onRemove,
    removeLabel = "Remove from history",
    colsPerRow = 6,
    isPriority = false,
    signal,
  } = options;
  const type = resolveMediaItemType(item);
  const title =
    item.is_chinese_origin && item.zh_title
      ? item.zh_title
      : item.title || item.name || "Untitled";
  const yearOrType =
    (item.release_date || item.first_air_date)?.substring(0, 4) ||
    (type === "tv" ? "Show" : "Movie");

  const card = document.createElement("a");
  card.href = `/player/${type}/${item.id}`;
  card.tabIndex = 0;
  card.className = cn("media-card", className);
  card.dataset.mediaType = type;
  card.dataset.mediaId = String(item.id);

  const posterBox = document.createElement("div");
  posterBox.className = "media-card-poster";

  const renderFallback = () => {
    const fb = document.createElement("div");
    fb.className = "media-card-fallback";
    fb.innerHTML = `
      ${type === "tv" ? icons.tv("media-card-fallback-icon") : icons.film("media-card-fallback-icon")}
      <span class="media-card-fallback-title">${escapeHtml(title)}</span>
    `;
    posterBox.prepend(fb);
  };

  if (item.poster_path) {
    const img = document.createElement("img");
    img.alt = title;
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.className = "media-card-img";
    // NOTE: Grids are fixed-viewport paginated (above the fold). Keep loading eager with
    // fetchpriority="high" on row 1 for LCP, and keep w500 in srcset for 4K TVs & 3x Retina phones.
    if (isPriority) {
      img.setAttribute("fetchpriority", "high");
    }
    img.sizes = buildPosterSizes(colsPerRow);
    img.srcset = `https://image.tmdb.org/t/p/w342${item.poster_path} 342w, https://image.tmdb.org/t/p/w500${item.poster_path} 500w`;
    img.src = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
    img.addEventListener(
      "error",
      () => {
        img.remove();
        renderFallback();
      },
      { once: true, signal }
    );
    posterBox.appendChild(img);
  } else {
    renderFallback();
  }

  const grad = document.createElement("div");
  grad.className = "media-card-gradient";
  posterBox.appendChild(grad);

  if (rank) {
    const rankBadge = document.createElement("div");
    rankBadge.className = "media-card-badge media-card-rank tabular-nums";
    rankBadge.innerHTML = `<span>${rank}</span>`;
    posterBox.appendChild(rankBadge);
  }

  if (onRemove) {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.tabIndex = -1;
    removeBtn.className = "media-card-remove";
    removeBtn.setAttribute("aria-label", `${removeLabel}: ${title}`);
    removeBtn.title = removeLabel;
    removeBtn.innerHTML = icons.x("media-card-remove-icon", 14, 2.25);
    removeBtn.addEventListener(
      "click",
      (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove(e);
      },
      { signal }
    );
    posterBox.appendChild(removeBtn);
  }

  if (item.vote_average) {
    const ratingBadge = document.createElement("div");
    ratingBadge.className = "media-card-badge media-card-rating tabular-nums";
    ratingBadge.innerHTML = `${icons.star("media-card-star")}<span>${item.vote_average.toFixed(1)}</span>`;
    posterBox.appendChild(ratingBadge);
  }

  const meta = document.createElement("div");
  meta.className = "media-card-meta";
  meta.innerHTML = `
    <h3 class="media-card-title">${escapeHtml(title)}</h3>
    <p class="media-card-year">${escapeHtml(yearOrType)}</p>
  `;

  card.append(posterBox, meta);

  // 150ms debounced hover & focus intent prefetching
  let intentTimer: ReturnType<typeof setTimeout> | null = null;

  const schedulePrefetch = () => {
    if (signal?.aborted) return;
    if (intentTimer !== null) clearTimeout(intentTimer);
    intentTimer = setTimeout(() => {
      intentTimer = null;
      if (signal?.aborted || !card.isConnected) return;
      api.prefetchMediaIntent(type, String(item.id));
    }, 150);
  };

  const cancelPrefetch = () => {
    if (intentTimer !== null) {
      clearTimeout(intentTimer);
      intentTimer = null;
    }
  };

  card.addEventListener("mouseenter", schedulePrefetch, { signal });
  card.addEventListener("focus", schedulePrefetch, { signal });
  card.addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.(".media-card-remove")) {
        return;
      }
      cancelPrefetch();
      api.prefetchMediaIntent(type, String(item.id));
      void preloadHlsLibrary();
    },
    { signal }
  );
  card.addEventListener("mouseleave", cancelPrefetch, { signal });
  card.addEventListener("blur", cancelPrefetch, { signal });
  signal.addEventListener("abort", cancelPrefetch, { once: true });

  return card;
}
