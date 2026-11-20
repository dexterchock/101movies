import "./polyfills";
import "./index.css";
import { icons } from "./icons";
import { initRouter } from "./router";
import { pullSyncState } from "./sync";

// Polyfill smooth-scroll options API on older Smart TV Chromium engines (WebOS / Tizen)
if (typeof window !== "undefined") {
  const proto = Element.prototype;
  const origElScrollTo = proto.scrollTo;
  if (typeof origElScrollTo === "function") {
    proto.scrollTo = function (
      optionsOrX?: ScrollToOptions | number,
      y?: number
    ) {
      try {
        if (typeof optionsOrX === "object" && optionsOrX !== null) {
          origElScrollTo.call(this, optionsOrX);
        } else {
          origElScrollTo.call(this, optionsOrX as number, y as number);
        }
      } catch {
        if (typeof optionsOrX === "object" && optionsOrX !== null) {
          if (typeof optionsOrX.left === "number")
            this.scrollLeft = optionsOrX.left;
          if (typeof optionsOrX.top === "number")
            this.scrollTop = optionsOrX.top;
        }
      }
    };
  } else {
    proto.scrollTo = function (
      optionsOrX?: ScrollToOptions | number,
      y?: number
    ) {
      if (typeof optionsOrX === "object" && optionsOrX !== null) {
        if (typeof optionsOrX.left === "number")
          this.scrollLeft = optionsOrX.left;
        if (typeof optionsOrX.top === "number")
          this.scrollTop = optionsOrX.top;
      } else {
        if (typeof optionsOrX === "number") this.scrollLeft = optionsOrX;
        if (typeof y === "number") this.scrollTop = y;
      }
    };
  }
}

interface NavItem {
  name: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Trending", path: "/", icon: icons.flame("bottom-nav-icon") },
  {
    name: "Rankings",
    path: "/rankings",
    icon: icons.trophy("bottom-nav-icon"),
  },
  {
    name: "History",
    path: "/history",
    icon: icons.history("bottom-nav-icon"),
  },
  {
    name: "Saved",
    path: "/saved",
    icon: icons.bookmark("bottom-nav-icon"),
  },
  { name: "Search", path: "/search", icon: icons.search("bottom-nav-icon") },
];

type Direction = "up" | "down" | "left" | "right";

function isVisibleFocusable(el: HTMLElement): boolean {
  if ((el as HTMLButtonElement | HTMLInputElement).disabled) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.pointerEvents === "none" ||
    style.opacity === "0"
  ) {
    return false;
  }
  return true;
}

function getSpatialCandidates(): HTMLElement[] {
  // Scope focus traversal when a modal or episode popover overlay is active
  const scope: ParentNode =
    document.querySelector(".modal-backdrop") ||
    document.querySelector(".episodes-popover") ||
    document;

  const nodes = scope.querySelectorAll<HTMLElement>(
    'a[href], button:not(:disabled):not(.media-card-remove), input:not(:disabled), [tabindex="0"]'
  );
  const result: HTMLElement[] = [];
  nodes.forEach((el) => {
    if (isVisibleFocusable(el)) {
      result.push(el);
    }
  });
  return result;
}

function findBestSpatialCandidate(
  current: HTMLElement,
  dir: Direction,
  candidates: HTMLElement[]
): HTMLElement | null {
  const curRect = current.getBoundingClientRect();
  const curCx = curRect.left + curRect.width / 2;
  const curCy = curRect.top + curRect.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const cand of candidates) {
    if (cand === current) continue;
    const r = cand.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const dx = cx - curCx;
    const dy = cy - curCy;

    let valid = false;
    let primaryDist = 0;
    let orthoDist = 0;
    let sameBandOverlap = 0;

    if (dir === "right") {
      valid = dx > 4;
      primaryDist = dx;
      orthoDist = Math.abs(dy);
      sameBandOverlap = Math.max(
        0,
        Math.min(curRect.bottom, r.bottom) - Math.max(curRect.top, r.top)
      );
    } else if (dir === "left") {
      valid = dx < -4;
      primaryDist = -dx;
      orthoDist = Math.abs(dy);
      sameBandOverlap = Math.max(
        0,
        Math.min(curRect.bottom, r.bottom) - Math.max(curRect.top, r.top)
      );
    } else if (dir === "down") {
      valid = dy > 4;
      primaryDist = dy;
      orthoDist = Math.abs(dx);
      sameBandOverlap = Math.max(
        0,
        Math.min(curRect.right, r.right) - Math.max(curRect.left, r.left)
      );
    } else {
      valid = dy < -4;
      primaryDist = -dy;
      orthoDist = Math.abs(dx);
      sameBandOverlap = Math.max(
        0,
        Math.min(curRect.right, r.right) - Math.max(curRect.left, r.left)
      );
    }

    if (!valid) continue;

    // Heavily favor elements aligned in the same row/column before jumping across sections
    const bandPenalty = sameBandOverlap > 0 ? 0 : 1000;
    const orthoWeight = dir === "left" || dir === "right" ? 3.5 : 2.5;
    const score = bandPenalty + primaryDist + orthoDist * orthoWeight;

    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  return best;
}

function scrollFocusTargetWithinTrack(el: HTMLElement) {
  const scroller = el.closest(".pill-scroll, .season-bar, .episodes-grid") as
    | HTMLElement
    | null;
  if (!scroller) return;
  const scrollerRect = scroller.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  if (scroller.classList.contains("episodes-grid")) {
    const offsetTop = elRect.top - scrollerRect.top + scroller.scrollTop;
    const targetTop = offsetTop - scrollerRect.height / 2 + elRect.height / 2;
    scroller.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  } else {
    const offsetLeft = elRect.left - scrollerRect.left + scroller.scrollLeft;
    const targetLeft = offsetLeft - scrollerRect.width / 2 + elRect.width / 2;
    scroller.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }
}

function attachSpatialNavigation() {
  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;

    const active = document.activeElement as HTMLElement | null;

    // Handle Tizen TV Remote Return / Back button on player page when overlays are closed
    if (e.keyCode === 10009 || e.key === "XF86Back") {
      if (
        !document.querySelector(".modal-backdrop") &&
        !document.querySelector(".episodes-popover") &&
        window.location.pathname.startsWith("/player/")
      ) {
        const backBtn = document.querySelector<HTMLElement>(".back-btn");
        if (backBtn) {
          e.preventDefault();
          backBtn.click();
          return;
        }
      }
    }

    // Do not hijack video shortcuts when focused inside active player or fullscreen
    if (
      document.fullscreenElement ||
      active instanceof HTMLVideoElement
    ) {
      return;
    }

    // Handle Smart TV remote Select / OK keys cleanly
    if (e.key === "Select" || e.key === "OK") {
      if (active && active !== document.body && !(active instanceof HTMLInputElement)) {
        e.preventDefault();
        active.click();
      }
      return;
    }

    const dirMap: Record<string, Direction | undefined> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };
    const dir = dirMap[e.key];
    if (!dir) return;

    // Inside text input: keep ArrowLeft/ArrowRight/ArrowUp for caret except Sync code input ArrowUp
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement
    ) {
      const allowArrowUp =
        dir === "up" && active.classList.contains("sync-code-input");
      if (!allowArrowUp && (dir === "left" || dir === "right" || dir === "up")) {
        return;
      }
    }

    const candidates = getSpatialCandidates();
    if (candidates.length === 0) return;

    if (!active || active === document.body || !candidates.includes(active)) {
      e.preventDefault();
      const initial =
        document.querySelector<HTMLElement>(".bottom-nav-link.is-active") ||
        document.querySelector<HTMLElement>(".media-card") ||
        candidates[0];
      initial?.focus({ preventScroll: true });
      return;
    }

    const next = findBestSpatialCandidate(active, dir, candidates);
    if (next) {
      e.preventDefault();
      next.focus({ preventScroll: true });
      scrollFocusTargetWithinTrack(next);
    }
  });
}

const BUNDLE_CHECK_INTERVAL_MS = 60_000;
let lastBundleCheckAt = Date.now();

function getCurrentBundlePath(): string | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>("script[src]");
  for (let i = 0; i < scripts.length; i++) {
    const m = scripts[i].src.match(/\/assets\/index-[^"'?#]+\.js/);
    if (m) return m[0];
  }
  return null;
}

async function checkForNewBundle(currentPath: string): Promise<void> {
  if (currentPath.startsWith("/player/")) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const current = getCurrentBundlePath();
  if (!current) return;
  const now = Date.now();
  if (now - lastBundleCheckAt < BUNDLE_CHECK_INTERVAL_MS) return;
  lastBundleCheckAt = now;

  try {
    const res = await fetch("/", { cache: "no-store" });
    if (!res.ok) return;
    const html = await res.text();
    const m = html.match(/\/assets\/index-[^"'?#]+\.js/);
    if (m && m[0] !== current) {
      window.location.reload();
    }
  } catch {}
}

function bootstrap() {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;

  const shell = document.createElement("div");
  shell.className = "app-shell";

  const mainStage = document.createElement("main");
  mainStage.className = "main-stage";

  const bottomNavWrap = document.createElement("div");
  bottomNavWrap.className = "bottom-nav-wrap";

  const bottomNav = document.createElement("nav");
  bottomNav.className = "bottom-nav";
  bottomNav.setAttribute("aria-label", "Primary Navigation");

  const indicator = document.createElement("div");
  indicator.className = "bottom-nav-indicator";
  indicator.setAttribute("aria-hidden", "true");
  bottomNav.appendChild(indicator);

  const linkEls = NAV_ITEMS.map((item) => {
    const a = document.createElement("a");
    a.href = item.path;
    a.tabIndex = 0;
    a.className = "bottom-nav-link";
    a.setAttribute("aria-label", item.name);
    a.innerHTML = `<span class="bottom-nav-link-inner">${item.icon}<span>${item.name}</span></span>`;
    bottomNav.appendChild(a);
    return a;
  });

  bottomNavWrap.appendChild(bottomNav);
  shell.append(bottomNavWrap, mainStage);
  rootEl.replaceChildren(shell);

  let currentPath = window.location.pathname || "/";

  function updateBottomNav() {
    const isPlayerPage = currentPath.startsWith("/player/");
    bottomNavWrap.style.display = isPlayerPage ? "none" : "";
    if (isPlayerPage) return;

    const normalizedPath = currentPath === "/watch-later" ? "/saved" : currentPath;
    const rawIndex = NAV_ITEMS.findIndex((item) => item.path === normalizedPath);
    const hasActiveTab = rawIndex !== -1;
    const activeIndex = hasActiveTab ? rawIndex : 0;

    const isMobileNav = window.innerWidth < 640;
    const navTabCount = NAV_ITEMS.length;
    const navTabGap = isMobileNav ? 4 : 8;
    const navTabWidth = isMobileNav
      ? Math.max(54, Math.min(72, Math.floor((window.innerWidth - 42) / navTabCount)))
      : Math.min(132, Math.floor((window.innerWidth - 78) / navTabCount));

    indicator.classList.toggle("is-hidden", !hasActiveTab);
    indicator.style.width = `${navTabWidth}px`;
    indicator.style.transform = `translate3d(${
      activeIndex * (navTabWidth + navTabGap)
    }px, 0, 0)`;

    linkEls.forEach((a, idx) => {
      const isActive = hasActiveTab && idx === activeIndex;
      a.style.width = `${navTabWidth}px`;
      a.classList.toggle("is-active", isActive);
    });
  }

  window.addEventListener("resize", updateBottomNav);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void checkForNewBundle(currentPath);
      void pullSyncState();
    }
  });
  attachSpatialNavigation();
  void pullSyncState(true);

  initRouter(mainStage, (pathname) => {
    currentPath = pathname;
    updateBottomNav();
    void checkForNewBundle(currentPath);
    if (pathname === "/history" || pathname === "/saved" || pathname === "/watch-later") {
      void pullSyncState();
    }
  });
}

bootstrap();
