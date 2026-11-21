import { mount as mountHistory } from "./pages/History";
import { mount as mountHome, type ViewCleanup } from "./pages/Home";
import { mount as mountPlayer } from "./pages/Player";
import { mount as mountRankings } from "./pages/Rankings";
import { mount as mountSearch } from "./pages/Search";
import { mount as mountWatchLater } from "./pages/WatchLater";

export interface NavigateOptions {
  replace?: boolean;
}

type RouteListener = (pathname: string) => void;

let stageContainer: HTMLElement | null = null;
let routeListener: RouteListener | null = null;
let activeView: ViewCleanup | null = null;
let currentHistoryIdx = 0;

function matchAndMount(pathname: string): boolean {
  if (!stageContainer) return false;

  if (pathname === "/") {
    activeView = mountHome(stageContainer);
    return true;
  }
  if (pathname === "/rankings") {
    activeView = mountRankings(stageContainer);
    return true;
  }
  if (pathname === "/history") {
    activeView = mountHistory(stageContainer);
    return true;
  }
  if (pathname === "/saved" || pathname === "/watch-later") {
    activeView = mountWatchLater(stageContainer);
    return true;
  }
  if (pathname === "/search") {
    activeView = mountSearch(stageContainer);
    return true;
  }

  const playerMatch = pathname.match(/^\/player\/(movie|tv)\/([^/]+)$/);
  if (playerMatch) {
    const type = playerMatch[1] as "movie" | "tv";
    const id = decodeURIComponent(playerMatch[2]);
    activeView = mountPlayer(stageContainer, { type, id }, navigate);
    return true;
  }

  return false;
}

function renderCurrentRoute() {
  if (!stageContainer) return;

  const pathname = window.location.pathname || "/";
  const isPlayerRoute = pathname.startsWith("/player/");

  if (!isPlayerRoute) {
    try {
      sessionStorage.setItem(
        "last_browse_path",
        `${pathname}${window.location.search || ""}`
      );
    } catch {}
  }

  // Clean up previous view DOM, listeners, pending fetches, and HLS instances
  if (activeView) {
    activeView.destroy();
    activeView = null;
  }

  // Fallback unknown routes to Home (matching <Route path="*" element={<Navigate to="/" replace />} />)
  if (!matchAndMount(pathname)) {
    currentHistoryIdx = window.history.state?.idx ?? currentHistoryIdx;
    window.history.replaceState({ idx: currentHistoryIdx }, "", "/");
    matchAndMount("/");
    routeListener?.("/");
    return;
  }

  routeListener?.(pathname);
}

export function navigate(path: string, opts?: NavigateOptions): void {
  const url = new URL(path, window.location.origin);
  const nextFull = `${url.pathname}${url.search}${url.hash}`;
  const curFull = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextFull === curFull && !opts?.replace) {
    return;
  }

  if (opts?.replace) {
    window.history.replaceState({ idx: currentHistoryIdx }, "", nextFull);
  } else {
    currentHistoryIdx += 1;
    window.history.pushState({ idx: currentHistoryIdx }, "", nextFull);
  }

  renderCurrentRoute();
}

export function remountCurrentRoute(): void {
  renderCurrentRoute();
}

export function initRouter(
  stageEl: HTMLElement,
  onRouteChange: RouteListener
): () => void {
  stageContainer = stageEl;
  routeListener = onRouteChange;

  const ac = new AbortController();
  const { signal } = ac;

  const existingIdx =
    window.history.state && typeof window.history.state.idx === "number"
      ? window.history.state.idx
      : 0;
  currentHistoryIdx = existingIdx;
  window.history.replaceState(
    { idx: currentHistoryIdx },
    "",
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  );

  // Intercept internal <a> clicks cleanly without full page reloads
  document.addEventListener(
    "click",
    (e) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const target = e.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      e.preventDefault();
      navigate(`${url.pathname}${url.search}`);
    },
    { signal }
  );

  window.addEventListener(
    "popstate",
    (e) => {
      currentHistoryIdx =
        e.state && typeof e.state.idx === "number" ? e.state.idx : 0;
      renderCurrentRoute();
    },
    { signal }
  );

  renderCurrentRoute();

  return () => {
    ac.abort();
    activeView?.destroy();
    activeView = null;
    stageContainer = null;
    routeListener = null;
  };
}
