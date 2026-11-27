import { api, isBackupApiActive, prewarmStreamManifests } from "../api";
import {
  createHlsPlayer,
  HlsPlayerController,
  preloadHlsLibrary,
} from "../components/HlsPlayer";
import {
  isAnimationTitle,
  isDesktopUpscaleSupported,
} from "../components/VideoUpscaler";
import { formatEpisodeLabel, getLocalizedGenreName, isZh, t } from "../i18n";
import { icons } from "../icons";
import {
  MediaDetails,
  MediaItem,
  ResolvedStreamSource,
  TmdbSeasonSummary,
  VodSeasonGroup,
  WatchProgress,
} from "../types";
import { escapeHtml, isInWatchLater, toggleWatchLater } from "../utils";
import { flushHistoryProgressSync, queueHistoryProgressSync } from "../sync";
import type { ViewCleanup } from "./Home";

// VOD search APIs responding >= 2500ms indicate high latency; PHP search APIs under 2.5s often still deliver fast CDN segments
const HIGH_PING_THRESHOLD_MS = 2500;

export type EpisodeLayoutMode = "compact" | "medium" | "list";

export function measureLabelVisualWidth(label: string): number {
  let w = 0;
  for (let i = 0; i < label.length; i++) {
    w += label.charCodeAt(i) > 0x7f ? 1.75 : 1;
  }
  return w;
}

export function getEpisodeLayoutMode(labels: string[]): EpisodeLayoutMode {
  let mediumCount = 0;
  let listCount = 0;
  for (let i = 0; i < labels.length; i++) {
    const w = measureLabelVisualWidth(labels[i]);
    if (w > 15) listCount++;
    else if (w > 8.5) mediumCount++;
  }
  if (listCount >= 2 || (labels.length > 0 && listCount / labels.length >= 0.25)) {
    return "list";
  }
  if (mediumCount >= 2 || listCount >= 1) {
    return "medium";
  }
  return "compact";
}

const DEFAULT_SITE_TITLE = "101Movies";
const DEFAULT_SITE_DESC =
  "Discover and stream trending movies and popular TV shows in high definition. Fast, ad-free streaming with smart TV navigation and real-time TMDB integration.";
const DEFAULT_SITE_IMAGE = "https://101movies.pages.dev/og-image.png?v=5";

function formatPlaybackTime(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 1) return "0:00";
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  if (hrs > 0) {
    const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

function cleanDisplayZhTitle(rawVodName?: string): string | undefined {
  if (!rawVodName || !/[\u4e00-\u9fff]/.test(rawVodName)) return undefined;
  return rawVodName
    .replace(/\s*[(（【[]?(19|20)\d{2}[)）】\]]?\s*$/, "")
    .replace(
      /\s*[(（【[]?\s*(粤语版?|国语版?|普通话版?|粤语配音|国语配音|中字|高清|超清|HD|BD|1080P)\s*[)）】\]]?\s*$/gi,
      ""
    )
    .replace(
      /[\s\-·:：/_]*(粤语版?|国语版?|普通话版?|粤语配音|国语配音|粤语|国语|普通话)\s*$/gi,
      ""
    )
    .replace(/\s*第\s*[一二两三四五六七八九十\d]+\s*[季部]\s*$/, "")
    .replace(/\s*(?:Season\s*\d+|S\d+)\s*$/i, "")
    .trim();
}

function formatServerLabel(src: ResolvedStreamSource): string {
  const parts = [src.sourceName];
  if (src.isManual) parts.push(t("player.customSourceTag"));
  if (src.audioLang) parts.push(src.audioLang);
  return parts.join(" · ");
}

function estimatePillSlotWidth(
  src: ResolvedStreamSource,
  overrideQuality?: string
): number {
  const label = formatServerLabel(src);
  let textWidth = 0;
  for (const ch of label) {
    textWidth += /[\u4e00-\u9fff]/.test(ch) ? 14.5 : 8;
  }
  const qStr = overrideQuality || src.quality || "1080P";
  const qWidth = qStr === "4K" || qStr === "2K" ? 22 : 36;
  const latencyStr = `${src.latencyMs}ms`;
  const latencyWidth = latencyStr.length * 7;
  return Math.ceil(34 + textWidth + 6 + qWidth + 6 + latencyWidth + 18);
}

function setHeadMeta(selector: string, attr: string, value: string): void {
  if (typeof document === "undefined") return;
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

interface ServerPageGroup {
  items: { src: ResolvedStreamSource; absoluteIndex: number }[];
}

function buildServerPages(
  sources: ResolvedStreamSource[],
  availableWidth: number,
  qualities: Record<string, string> = {}
): ServerPageGroup[] {
  if (sources.length === 0) return [];

  const totalWidthAll = sources.reduce(
    (sum, s) => sum + estimatePillSlotWidth(s, qualities[s.sourceId]),
    0
  );
  if (totalWidthAll <= availableWidth - 8) {
    return [
      {
        items: sources.map((src, absoluteIndex) => ({ src, absoluteIndex })),
      },
    ];
  }

  const maxRowWidth = Math.max(160, availableWidth - 108);
  const pages: ServerPageGroup[] = [];
  let currentItems: { src: ResolvedStreamSource; absoluteIndex: number }[] = [];
  let currentWidth = 0;

  sources.forEach((src, absoluteIndex) => {
    const w = estimatePillSlotWidth(src, qualities[src.sourceId]);
    if (
      currentItems.length > 0 &&
      (currentWidth + w > maxRowWidth || currentItems.length >= 7)
    ) {
      pages.push({ items: currentItems });
      currentItems = [{ src, absoluteIndex }];
      currentWidth = w;
    } else {
      currentItems.push({ src, absoluteIndex });
      currentWidth += w;
    }
  });

  if (currentItems.length > 0) {
    pages.push({ items: currentItems });
  }

  return pages;
}

function findPageForSourceIndex(
  pages: ServerPageGroup[],
  targetIndex: number
): number {
  for (let p = 0; p < pages.length; p++) {
    if (pages[p].items.some((item) => item.absoluteIndex === targetIndex)) {
      return p;
    }
  }
  return 0;
}

function copyTextSilently(text?: string) {
  if (!text) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(trimmed).catch(() => {});
  }
}

function resolveCountryCode(details: MediaDetails): string {
  if (Array.isArray(details.origin_country) && details.origin_country.length > 0) {
    const code = String(details.origin_country[0] || "").toUpperCase().trim();
    if (code) return code;
  }
  if (
    Array.isArray(details.production_countries) &&
    details.production_countries.length > 0
  ) {
    const code = String(details.production_countries[0]?.iso_3166_1 || "")
      .toUpperCase()
      .trim();
    if (code) return code;
  }
  const langMap: Record<string, string> = {
    en: "US",
    ja: "JP",
    ko: "KR",
    yue: "HK",
    zh: "CN",
    cn: "CN",
    fr: "FR",
    es: "ES",
    de: "DE",
    it: "IT",
    th: "TH",
    hi: "IN",
    ru: "RU",
  };
  const origLang = String(details.original_language || "").toLowerCase().trim();
  return langMap[origLang] || "";
}

function buildMetaRowHtml(details: MediaDetails): string {
  const releaseYear = (
    details.release_date || details.first_air_date
  )?.substring(0, 4);
  const countryCode = resolveCountryCode(details);
  const genreNames = details.genres
    ?.slice(0, 3)
    .map((g) => getLocalizedGenreName(g))
    .join(", ");
  const castList = (details.cast || []).slice(0, 4);

  const metaParts: string[] = [];
  if (releaseYear) metaParts.push(`<span>${escapeHtml(releaseYear)}</span>`);
  if (countryCode) {
    if (metaParts.length > 0) metaParts.push(`<span class="player-meta-dot">&middot;</span>`);
    metaParts.push(`<span>${escapeHtml(countryCode)}</span>`);
  }
  if (details.runtime) {
    if (metaParts.length > 0) metaParts.push(`<span class="player-meta-dot">&middot;</span>`);
    metaParts.push(
      `<span>${escapeHtml(t("player.minutes", { mins: details.runtime }))}</span>`
    );
  }
  if (details.vote_average > 0) {
    if (metaParts.length > 0) metaParts.push(`<span class="player-meta-dot">&middot;</span>`);
    metaParts.push(
      `<span class="player-meta-rating">&#9733; ${details.vote_average.toFixed(1)}</span>`
    );
  }
  if (genreNames) {
    if (metaParts.length > 0) metaParts.push(`<span class="player-meta-dot">&middot;</span>`);
    metaParts.push(`<span class="player-meta-genres">${escapeHtml(genreNames)}</span>`);
  }
  if (castList.length > 0) {
    if (metaParts.length > 0) metaParts.push(`<span class="player-meta-dot">&middot;</span>`);
    metaParts.push(
      `<span class="player-meta-cast">${escapeHtml(castList.join(", "))}</span>`
    );
  }
  return metaParts.join("");
}

function buildImdbHref(imdbId: string, fallbackTitle: string): string {
  return imdbId
    ? `https://www.imdb.com/title/${encodeURIComponent(imdbId)}/`
    : `https://www.imdb.com/find/?s=tt&q=${encodeURIComponent(fallbackTitle)}`;
}

function buildDoubanHref(
  doubanId: string | undefined,
  fallbackTitle: string
): string {
  return doubanId
    ? `https://movie.douban.com/subject/${encodeURIComponent(doubanId)}/`
    : `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(
        fallbackTitle
      )}`;
}

export function mount(
  container: HTMLElement,
  params: { type: "movie" | "tv"; id: string },
  navigate: (path: string, opts?: { replace?: boolean }) => void
): ViewCleanup {
  const { type, id } = params;
  const ac = new AbortController();
  const { signal } = ac;

  let existingHistoryItem: MediaItem | null = null;
  let savedProgress: WatchProgress | null = (() => {
    try {
      const stored = localStorage.getItem("watch_history");
      const history: MediaItem[] = stored ? JSON.parse(stored) : [];
      const existing = history.find(
        (item) =>
          item.id.toString() === id && (item.media_type || "movie") === type
      );
      if (existing) existingHistoryItem = existing;
      return existing?.watchProgress || null;
    } catch {
      return null;
    }
  })();

  // Hydrate immediately from details cache or list/history preview so opening a card never flashes a skeleton
  let fullDetails: MediaDetails | null = api.getCachedDetails(type, id) ?? null;
  const previewItem: MediaItem | null = fullDetails
    ? null
    : api.getPreviewItem(type, id) ?? existingHistoryItem ?? null;
  let details: MediaDetails | null =
    fullDetails || (previewItem ? { ...previewItem, genres: [], tagline: "" } : null);

  const cachedVod = api.getCachedVodStreams(type, id);
  let defaultSources: ResolvedStreamSource[] = cachedVod?.sources
    ? [...cachedVod.sources]
    : [];
  let manualOverrideSource: ResolvedStreamSource | null = null;
  let sources: ResolvedStreamSource[] = [...defaultSources];
  let manualRestoreAttempted = false;
  let manualRestoreCanceled = false;
  let tmdbSeasonsMeta: TmdbSeasonSummary[] = cachedVod?.tmdbSeasons || [];
  let lastSearchQuery = cachedVod?.searchQuery || "";
  let resolving = !cachedVod;

  function rebuildSourcesList() {
    sources = manualOverrideSource
      ? [manualOverrideSource, ...defaultSources]
      : [...defaultSources];
  }

  const detectedQualities: Record<string, string> = {};
  sources.forEach((src) => {
    const q = api.getCachedManifestQuality(src.episodes?.[0]?.url);
    if (q) detectedQualities[src.sourceId] = q;
  });

  let activeServerIndex: number | null = null;
  let activeSeasonIndex = 0;
  let activeEpisodeIndex = 0;
  let isPlaying = false;
  let isEpisodePopoverOpen = false;
  let episodeSortDesc = false;
  let shouldScrollActiveEp = false;
  let loadingSeasonNum: number | null = null;
  let selectedUnloadedSeasonNum: number | null = null;
  const missingSeasonEmpty = new Set<number>();
  let isManualPickerOpen = false;
  let manualQuery = "";
  let manualLoading = false;
  let manualResults: ResolvedStreamSource[] = [];
  let manualSearchedOnce = false;
  let manualSearchController: AbortController | null = null;
  let initialSeekTime = 0;
  let lastSaveTime = 0;
  let currentVideoTime = 0;
  let serverPage = 0;
  let serverBarWidth =
    typeof window !== "undefined" ? Math.max(320, window.innerWidth - 420) : 800;

  let hlsController: HlsPlayerController | null = null;
  let currentPlayedUrl = "";
  let proxyFallbackPass = false;
  let triedServerIndices = new Set<number>();
  let failoverStartServerIndex = 0;
  let renderedHeroKey = "";
  let backdropLoaded = false;

  // Build static outer shell
  const root = document.createElement("div");
  root.className = "player-page";

  const backBtnWrap = document.createElement("div");
  backBtnWrap.className = "back-btn-wrap";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "back-btn";
  backBtn.setAttribute("aria-label", t("player.backAria"));
  backBtn.tabIndex = 0;
  backBtn.innerHTML = `<span class="back-btn-inner">${icons.arrowLeft(
    "back-btn-icon",
    18
  )}<span>${escapeHtml(t("player.back"))}</span></span>`;
  backBtn.addEventListener("mousedown", (e) => e.stopPropagation(), { signal });
  backBtn.addEventListener("click", handleBack, { signal });
  backBtnWrap.appendChild(backBtn);

  let upscaleBtn: HTMLButtonElement | null = null;
  const syncUpscaleBtnVisibility = (isPlayerMounted: boolean) => {
    if (!upscaleBtn) return;
    upscaleBtn.hidden = !isPlayerMounted;
  };

  if (isDesktopUpscaleSupported()) {
    upscaleBtn = document.createElement("button");
    upscaleBtn.type = "button";
    upscaleBtn.className = "back-btn upscale-btn";
    upscaleBtn.setAttribute("aria-label", t("player.upscaleAria"));
    upscaleBtn.tabIndex = 0;
    upscaleBtn.innerHTML = `<span class="back-btn-inner">${icons.maximize(
      "back-btn-icon",
      18
    )}<span>${escapeHtml(t("player.upscale"))}</span></span>`;
    upscaleBtn.hidden = true;
    upscaleBtn.addEventListener("mousedown", (e) => e.stopPropagation(), {
      signal,
    });
    upscaleBtn.addEventListener(
      "click",
      () => {
        if (!isPlaying) return;
        hlsController?.enterUpscaleFullscreen();
        upscaleBtn?.blur();
      },
      { signal }
    );
    backBtnWrap.appendChild(upscaleBtn);
  }

  const stageEl = document.createElement("div");
  stageEl.className = "player-stage";

  const bottomBar = document.createElement("div");
  bottomBar.className = "player-bottom-bar";

  const serverBarEl = document.createElement("div");
  serverBarEl.className = "server-bar";

  const actionsRightEl = document.createElement("div");
  actionsRightEl.className = "player-actions-right";

  bottomBar.append(serverBarEl, actionsRightEl);
  root.append(backBtnWrap, stageEl, bottomBar);
  container.replaceChildren(root);

  let popoverWrapRef: HTMLElement | null = null;

  function restoreHeadMeta() {
    document.title = DEFAULT_SITE_TITLE;
    setHeadMeta('meta[name="title"]', "content", DEFAULT_SITE_TITLE);
    setHeadMeta('meta[name="description"]', "content", DEFAULT_SITE_DESC);
    setHeadMeta('meta[property="og:type"]', "content", "website");
    setHeadMeta('meta[property="og:title"]', "content", DEFAULT_SITE_TITLE);
    setHeadMeta('meta[property="og:description"]', "content", DEFAULT_SITE_DESC);
    setHeadMeta('meta[property="og:image"]', "content", DEFAULT_SITE_IMAGE);
    setHeadMeta(
      'meta[property="og:image:alt"]',
      "content",
      "101Movies - Cinematic Streaming Platform"
    );
    setHeadMeta('meta[property="og:url"]', "content", "https://101movies.pages.dev/");
    setHeadMeta('meta[name="twitter:title"]', "content", DEFAULT_SITE_TITLE);
    setHeadMeta('meta[name="twitter:description"]', "content", DEFAULT_SITE_DESC);
    setHeadMeta('meta[name="twitter:image"]', "content", DEFAULT_SITE_IMAGE);
  }

  function syncHeadMeta() {
    if (!details || (!details.title && !details.name)) return;
    const zhMode = isZh();
    const raw = details.title || details.name || "";
    const en = details.en_title || raw;
    const zh = details.zh_title;
    const shareTitle = zhMode
      ? zh || en || raw
      : details.is_chinese_origin && zh
      ? zh
      : en || zh || raw;
    if (!shareTitle) return;

    const releaseYear = (details.release_date || details.first_air_date || "").slice(
      0,
      4
    );
    const metaParts = [
      type === "tv" ? t("type.tvSeriesLabel") : t("type.movieSingular"),
      releaseYear,
      details.vote_average ? `★ ${details.vote_average.toFixed(1)}` : "",
    ].filter(Boolean);
    const rawOverview = zhMode
      ? details.zh_overview || details.overview || ""
      : details.overview || "";
    const cleanOverview = rawOverview.replace(/\s+/g, " ").trim();
    const shareDesc = cleanOverview
      ? `${metaParts.join(" · ")} — ${cleanOverview.slice(0, 220)}`
      : `Watch ${shareTitle} (${metaParts.join(" · ")}) on 101Movies.`;
    const ogTitle = releaseYear ? `${shareTitle} (${releaseYear})` : shareTitle;
    const shareImage =
      details.backdrop_path || details.poster_path
        ? `${window.location.origin}/api/og/${type}/${id}?v=3`
        : DEFAULT_SITE_IMAGE;
    const shareUrl = `${window.location.origin}/player/${type}/${id}`;

    document.title = `${shareTitle} · ${DEFAULT_SITE_TITLE}`;
    setHeadMeta('meta[name="title"]', "content", ogTitle);
    setHeadMeta('meta[name="description"]', "content", shareDesc);
    setHeadMeta(
      'meta[property="og:type"]',
      "content",
      type === "tv" ? "video.tv_show" : "video.movie"
    );
    setHeadMeta('meta[property="og:title"]', "content", ogTitle);
    setHeadMeta('meta[property="og:description"]', "content", shareDesc);
    setHeadMeta('meta[property="og:image"]', "content", shareImage);
    setHeadMeta('meta[property="og:image:alt"]', "content", ogTitle);
    setHeadMeta('meta[property="og:url"]', "content", shareUrl);
    setHeadMeta('meta[name="twitter:title"]', "content", ogTitle);
    setHeadMeta('meta[name="twitter:description"]', "content", shareDesc);
    setHeadMeta('meta[name="twitter:image"]', "content", shareImage);
  }

  type DisplaySeasonEntry =
    | (VodSeasonGroup & { unloaded: false })
    | {
        seasonNumber: number;
        name: string;
        vodId: string | number;
        vodName: string;
        episodes: [];
        unloaded: true;
      };

  function isDistinctTmdbSeasonName(name?: string): boolean {
    const trimmed = String(name || "").trim();
    if (!trimmed) return false;
    if (/^第\s*[一二两三四五六七八九十\d]+\s*[季部期]$/i.test(trimmed)) return false;
    if (/^(?:Season|Series)\s*\d+$/i.test(trimmed)) return false;
    if (/^Specials?$/i.test(trimmed)) return false;
    return true;
  }

  function getDisplaySeasons(serverSeasons: VodSeasonGroup[]): DisplaySeasonEntry[] {
    const entries: DisplaySeasonEntry[] = serverSeasons.map((s) => ({
      ...s,
      unloaded: false as const,
    }));
    if (
      type !== "tv" ||
      tmdbSeasonsMeta.length <= 1 ||
      tmdbSeasonsMeta.length > 15
    ) {
      return entries;
    }

    const s1Matched = serverSeasons.find((s) => s.seasonNumber === 1);
    const tmdbS1 = tmdbSeasonsMeta.find((s) => s.seasonNumber === 1);
    if (
      s1Matched &&
      (s1Matched.episodes.length >= 100 ||
        (tmdbS1?.episodeCount &&
          s1Matched.episodes.length >= tmdbS1.episodeCount * 1.5))
    ) {
      return entries;
    }

    const existingNums = new Set(serverSeasons.map((s) => s.seasonNumber));
    const maxMatchedNum = serverSeasons.reduce(
      (mx, s) => (s.seasonNumber > mx ? s.seasonNumber : mx),
      0
    );

    for (const ts of tmdbSeasonsMeta) {
      if (ts.seasonNumber <= 0 || existingNums.has(ts.seasonNumber)) continue;
      if (isDistinctTmdbSeasonName(ts.name) || ts.seasonNumber < maxMatchedNum) {
        entries.push({
          seasonNumber: ts.seasonNumber,
          name: `Season ${ts.seasonNumber}`,
          vodId: 0,
          vodName: ts.name,
          episodes: [],
          unloaded: true as const,
        });
      }
    }

    entries.sort((a, b) => a.seasonNumber - b.seasonNumber);
    return entries;
  }

  function loadMissingSeason(targetSeasonNum: number) {
    if (signal.aborted || loadingSeasonNum === targetSeasonNum) return;
    selectedUnloadedSeasonNum = targetSeasonNum;
    loadingSeasonNum = targetSeasonNum;
    renderActionsRight();

    api
      .resolveVodSeason(id, targetSeasonNum, signal)
      .then((res) => {
        if (signal.aborted) return;
        loadingSeasonNum = null;
        const returned = res?.sources || [];
        if (returned.length === 0) {
          missingSeasonEmpty.add(targetSeasonNum);
          renderActionsRight();
          return;
        }

        const baseSiteId = (sid: string) => sid.replace(/_(?:guo|yue)$/i, "");
        for (const retSrc of returned) {
          const seasonGroup = retSrc.seasons?.find(
            (s) => s.seasonNumber === targetSeasonNum
          ) || {
            seasonNumber: targetSeasonNum,
            name: `Season ${targetSeasonNum}`,
            vodId: retSrc.vodId,
            vodName: retSrc.vodName,
            episodes: retSrc.episodes,
          };

          const existingIdx = defaultSources.findIndex(
            (s) =>
              s.sourceId === retSrc.sourceId ||
              (!s.audioLang &&
                !retSrc.audioLang &&
                baseSiteId(s.sourceId) === baseSiteId(retSrc.sourceId))
          );

          if (existingIdx >= 0) {
            const target = defaultSources[existingIdx];
            const prevSeasons = target.seasons
              ? [...target.seasons]
              : [
                  {
                    seasonNumber: 1,
                    name: "Season 1",
                    vodId: target.vodId,
                    vodName: target.vodName,
                    episodes: target.episodes,
                  },
                ];
            if (!prevSeasons.some((s) => s.seasonNumber === targetSeasonNum)) {
              prevSeasons.push(seasonGroup);
              prevSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
              defaultSources[existingIdx] = {
                ...target,
                seasons: prevSeasons,
              };
            }
          } else {
            defaultSources.push({
              ...retSrc,
              seasons: [seasonGroup],
            });
          }
        }
        rebuildSourcesList();

        const derived = getDerivedState();
        let serverSeasons = derived.episodeSourceServer?.seasons || [];
        let loadedIdx = serverSeasons.findIndex(
          (s) => s.seasonNumber === targetSeasonNum
        );
        if (loadedIdx < 0) {
          const fallbackSrvIdx = sources.findIndex((src) =>
            (src.seasons || []).some((s) => s.seasonNumber === targetSeasonNum)
          );
          if (fallbackSrvIdx >= 0) {
            activeServerIndex = fallbackSrvIdx;
            const pages = buildServerPages(sources, serverBarWidth, detectedQualities);
            serverPage = findPageForSourceIndex(pages, fallbackSrvIdx);
            serverSeasons = sources[fallbackSrvIdx].seasons || [];
            loadedIdx = serverSeasons.findIndex(
              (s) => s.seasonNumber === targetSeasonNum
            );
          }
        }
        if (loadedIdx >= 0) {
          activeSeasonIndex = loadedIdx;
          activeEpisodeIndex = 0;
          selectedUnloadedSeasonNum = null;
        } else {
          missingSeasonEmpty.add(targetSeasonNum);
        }
        renderServerBar();
        renderActionsRight();
      })
      .catch(() => {
        if (signal.aborted) return;
        loadingSeasonNum = null;
        missingSeasonEmpty.add(targetSeasonNum);
        renderActionsRight();
      });
  }

  function runManualSearch(rawQuery: string) {
    const q = rawQuery.trim();
    if (!q || signal.aborted) return;
    manualSearchController?.abort();
    const ctrl = new AbortController();
    manualSearchController = ctrl;
    const onAbort = () => ctrl.abort();
    signal.addEventListener("abort", onAbort, { once: true });

    manualQuery = q;
    manualLoading = true;
    manualSearchedOnce = true;
    renderActionsRight();

    api
      .searchRawVodSources(type, id, q, ctrl.signal)
      .then((res) => {
        if (signal.aborted || ctrl.signal.aborted) return;
        manualResults = res?.sources || [];
        manualLoading = false;
        renderActionsRight();
      })
      .catch(() => {
        if (signal.aborted || ctrl.signal.aborted) return;
        manualResults = [];
        manualLoading = false;
        renderActionsRight();
      })
      .finally(() => {
        signal.removeEventListener("abort", onAbort);
      });
  }

  function applyManualSource(picked: ResolvedStreamSource) {
    manualRestoreCanceled = true;
    const keyword =
      (manualQuery || lastSearchQuery || "").trim() || picked.vodName;
    manualOverrideSource = {
      ...picked,
      isManual: true,
    };
    rebuildSourcesList();
    const q = api.getCachedManifestQuality(picked.episodes?.[0]?.url);
    if (q) detectedQualities[picked.sourceId] = q;

    const pages = buildServerPages(sources, serverBarWidth, detectedQualities);
    serverPage = findPageForSourceIndex(pages, 0);
    isManualPickerOpen = false;
    selectedUnloadedSeasonNum = null;

    if (picked.episodes.length <= 1) {
      isEpisodePopoverOpen = false;
      startPlaybackWithProgress(0, 0, 0, 0);
    } else {
      activeServerIndex = 0;
      activeSeasonIndex = 0;
      activeEpisodeIndex = 0;
      syncStage();
      renderBottomBar();
    }
    prewarmStreamManifests([manualOverrideSource], signal, (sourceId, qVal) => {
      if (signal.aborted) return;
      applyDetectedQuality(sourceId, qVal);
    });
    if (!manualQuery.trim()) {
      manualQuery = keyword;
    }
  }

  function resetManualSource() {
    manualRestoreCanceled = true;
    manualOverrideSource = null;
    rebuildSourcesList();
    isManualPickerOpen = false;
    selectedUnloadedSeasonNum = null;
    activeSeasonIndex = 0;
    activeEpisodeIndex = 0;
    serverPage = 0;

    if (savedProgress?.manualPick) {
      const clearedProgress: WatchProgress = {
        ...savedProgress,
        sourceId: defaultSources[0]?.sourceId,
        manualPick: undefined,
      };
      savedProgress = clearedProgress;
      persistWatchHistory(details, clearedProgress, true);
    }

    if (isPlaying) {
      if (defaultSources.length > 0) {
        startPlaybackWithProgress(0, 0, 0, 0);
      } else {
        isPlaying = false;
        activeServerIndex = null;
        isEpisodePopoverOpen = false;
        syncStage();
        renderBottomBar();
      }
    } else {
      activeServerIndex = null;
      if (defaultSources.length === 0) {
        isEpisodePopoverOpen = false;
      }
      syncStage();
      renderBottomBar();
    }
  }

  function restoreManualPickFromProgress() {
    if (
      signal.aborted ||
      manualRestoreAttempted ||
      manualRestoreCanceled ||
      manualOverrideSource ||
      !savedProgress?.manualPick
    ) {
      return;
    }
    const pick = savedProgress.manualPick;
    const kw = (pick.keyword || pick.vodName || "").trim();
    if (!kw) return;
    manualRestoreAttempted = true;

    api
      .searchRawVodSources(type, id, kw, signal)
      .then((res) => {
        if (signal.aborted || manualRestoreCanceled || manualOverrideSource) {
          return;
        }
        const list = res?.sources || [];
        const restored =
          list.find((s) => s.sourceId === pick.sourceId) ||
          list.find((s) => s.vodName === pick.vodName);
        if (!restored) return;

        manualOverrideSource = {
          ...restored,
          isManual: true,
        };
        if (!manualQuery.trim()) {
          manualQuery = kw;
        }
        const q = api.getCachedManifestQuality(restored.episodes?.[0]?.url);
        if (q) detectedQualities[restored.sourceId] = q;

        if (isPlaying && activeServerIndex !== null) {
          const playingSrc = sources[activeServerIndex];
          rebuildSourcesList();
          const newIdx = playingSrc
            ? sources.findIndex((s) => s.sourceId === playingSrc.sourceId)
            : -1;
          activeServerIndex = newIdx >= 0 ? newIdx : 1;
        } else {
          rebuildSourcesList();
          const pages = buildServerPages(sources, serverBarWidth, detectedQualities);
          serverPage = findPageForSourceIndex(pages, 0);
        }

        syncStage();
        renderBottomBar();
        prewarmStreamManifests([manualOverrideSource], signal, (sourceId, qVal) => {
          if (signal.aborted) return;
          applyDetectedQuality(sourceId, qVal);
        });
      })
      .catch(() => {});
  }

  function getDerivedState() {
    const activeServer =
      activeServerIndex !== null ? sources[activeServerIndex] || null : null;
    const episodeSourceServer = activeServer || sources[0] || null;
    const seasons = episodeSourceServer?.seasons || [];
    const displaySeasons = getDisplaySeasons(seasons);
    const hasMultipleSeasons = displaySeasons.length > 1;
    const safeSeasonIndex =
      seasons.length > 0 && activeSeasonIndex < seasons.length
        ? activeSeasonIndex
        : 0;
    const currentSeasonGroup =
      seasons.length > 0 ? seasons[safeSeasonIndex] : null;

    const episodes = currentSeasonGroup
      ? currentSeasonGroup.episodes
      : episodeSourceServer?.episodes || [];
    const safeEpisodeIndex =
      activeEpisodeIndex < episodes.length ? activeEpisodeIndex : 0;

    const activeServerSeasons = activeServer?.seasons || [];
    const activeServerSafeSeasonIdx =
      activeServerSeasons.length > 0 &&
      activeSeasonIndex < activeServerSeasons.length
        ? activeSeasonIndex
        : 0;
    const activeServerSeasonGroup =
      activeServerSeasons.length > 0
        ? activeServerSeasons[activeServerSafeSeasonIdx]
        : null;
    const activeServerEpisodes = activeServerSeasonGroup
      ? activeServerSeasonGroup.episodes
      : activeServer?.episodes || [];

    const activeEpisodeIndexClamped =
      activeEpisodeIndex < activeServerEpisodes.length ? activeEpisodeIndex : 0;
    const activeEpisodeObj = activeServerEpisodes[activeEpisodeIndexClamped];
    const activeStreamUrl = activeServer ? activeEpisodeObj?.url || "" : "";

    return {
      activeServer,
      episodeSourceServer,
      seasons,
      displaySeasons,
      hasMultipleSeasons,
      safeSeasonIndex,
      currentSeasonGroup,
      episodes,
      safeEpisodeIndex,
      activeServerSafeSeasonIdx,
      activeServerSeasonGroup,
      activeEpisodeIndexClamped,
      activeEpisodeObj,
      activeStreamUrl,
    };
  }

  function toSlimHistoryItem(
    item: MediaItem,
    itemType: "movie" | "tv",
    watchProgress?: WatchProgress
  ): MediaItem {
    return {
      id: item.id,
      title: item.title,
      name: item.name,
      en_title: item.en_title,
      zh_title: item.zh_title,
      is_chinese_origin: item.is_chinese_origin,
      poster_path: item.poster_path ?? null,
      backdrop_path: item.backdrop_path ?? null,
      overview: item.overview || "",
      vote_average: item.vote_average || 0,
      media_type: itemType,
      release_date: item.release_date,
      first_air_date: item.first_air_date,
      ...(watchProgress ? { watchProgress } : {}),
    };
  }

  function persistWatchHistory(
    mediaDetails: MediaDetails | null,
    progressUpdate: WatchProgress,
    syncImmediately = false
  ) {
    if (!mediaDetails) return;
    try {
      const stored = localStorage.getItem("watch_history");
      const rawHistory: MediaItem[] = stored ? JSON.parse(stored) : [];
      const history: MediaItem[] = Array.isArray(rawHistory)
        ? rawHistory.map((item) => {
            const itemType: "movie" | "tv" =
              item.media_type === "tv" ||
              (!item.media_type && !item.title && Boolean(item.name))
                ? "tv"
                : "movie";
            return toSlimHistoryItem(item, itemType, item.watchProgress);
          })
        : [];
      const existingItem = history.find(
        (item) =>
          item.id.toString() === id && (item.media_type || "movie") === type
      );
      const mergedProgress: WatchProgress = {
        ...(existingItem?.watchProgress || {}),
        ...progressUpdate,
        updatedAt: Date.now(),
      };
      if ("manualPick" in progressUpdate && !progressUpdate.manualPick) {
        delete mergedProgress.manualPick;
      }
      const filtered = history.filter(
        (item) =>
          !(item.id.toString() === id && (item.media_type || "movie") === type)
      );
      filtered.unshift(toSlimHistoryItem(mediaDetails, type, mergedProgress));
      localStorage.setItem(
        "watch_history",
        JSON.stringify(filtered.slice(0, 20))
      );
      savedProgress = mergedProgress;
      queueHistoryProgressSync(syncImmediately);
    } catch {}
  }

  function handleBack() {
    flushCurrentPlayback();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (isPlaying) {
      isPlaying = false;
      activeServerIndex = null;
      isEpisodePopoverOpen = false;
      syncStage();
      renderBottomBar();
      return;
    }
    const fallbackPath = sessionStorage.getItem("last_browse_path") || "/";
    const canGoBackInRouter =
      window.history.state &&
      typeof window.history.state.idx === "number" &&
      window.history.state.idx > 0;

    if (canGoBackInRouter) {
      const currentUrl = window.location.pathname;
      window.history.back();
      window.setTimeout(() => {
        if (!signal.aborted && window.location.pathname === currentUrl) {
          navigate(fallbackPath, { replace: true });
        }
      }, 60);
    } else {
      navigate(fallbackPath);
    }
  }

  function startPlaybackWithProgress(
    serverIdx: number,
    seasonIdx: number,
    episodeIdx: number,
    seekTime = 0,
    preserveFailover = false
  ) {
    const targetServer = sources[serverIdx];
    if (!targetServer) return;

    if (!preserveFailover) {
      proxyFallbackPass = false;
      triedServerIndices.clear();
      failoverStartServerIndex = serverIdx;
    }

    const targetSeasons = targetServer.seasons || [];
    const clampedSeasonIdx =
      targetSeasons.length > 0 && seasonIdx < targetSeasons.length
        ? seasonIdx
        : 0;
    const seasonGroup =
      targetSeasons.length > 0 ? targetSeasons[clampedSeasonIdx] : null;
    const targetEpisodes = seasonGroup
      ? seasonGroup.episodes
      : targetServer.episodes;
    const clampedEpIdx =
      episodeIdx < targetEpisodes.length ? episodeIdx : 0;
    const epObj = targetEpisodes[clampedEpIdx];
    const epLabel = formatEpisodeLabel(epObj?.name || "", clampedEpIdx);

    activeServerIndex = serverIdx;
    activeSeasonIndex = clampedSeasonIdx;
    activeEpisodeIndex = clampedEpIdx;
    initialSeekTime = seekTime;
    currentVideoTime = seekTime;
    isPlaying = true;

    const manualPickMeta = targetServer.isManual
      ? {
          sourceId: targetServer.sourceId,
          vodName: targetServer.vodName,
          keyword:
            (manualQuery || lastSearchQuery || "").trim() ||
            targetServer.vodName,
        }
      : undefined;

    persistWatchHistory(
      details,
      {
        sourceId: targetServer.sourceId,
        seasonNumber: seasonGroup?.seasonNumber,
        seasonIndex: clampedSeasonIdx,
        episodeIndex: clampedEpIdx,
        episodeLabel: epLabel,
        currentTime: seekTime,
        manualPick: manualPickMeta,
      },
      true
    );

    syncStage();
    renderBottomBar();
  }

  function handleResumeClick() {
    if (!savedProgress || sources.length === 0) return;

    let targetServerIdx = 0;
    if (savedProgress.sourceId) {
      const foundIdx = sources.findIndex(
        (s) => s.sourceId === savedProgress!.sourceId
      );
      if (foundIdx >= 0) {
        targetServerIdx = foundIdx;
      }
    }

    const targetServer = sources[targetServerIdx];
    const targetSeasons = targetServer.seasons || [];
    let targetSeasonIdx = savedProgress.seasonIndex ?? 0;
    if (targetSeasons.length > 0 && savedProgress.seasonNumber !== undefined) {
      const foundSeasonIdx = targetSeasons.findIndex(
        (s) => s.seasonNumber === savedProgress!.seasonNumber
      );
      if (foundSeasonIdx >= 0) {
        targetSeasonIdx = foundSeasonIdx;
      }
    }
    if (targetSeasonIdx >= targetSeasons.length) {
      targetSeasonIdx = 0;
    }

    const targetEpIdx = savedProgress.episodeIndex ?? 0;
    const seekTo = savedProgress.currentTime ?? 0;

    const pages = buildServerPages(sources, serverBarWidth, detectedQualities);
    serverPage = findPageForSourceIndex(pages, targetServerIdx);
    isEpisodePopoverOpen = false;
    startPlaybackWithProgress(
      targetServerIdx,
      targetSeasonIdx,
      targetEpIdx,
      seekTo
    );
  }

  function handleStreamError() {
    if (signal.aborted || activeServerIndex === null || sources.length === 0) {
      return;
    }

    triedServerIndices.add(activeServerIndex);

    for (let offset = 1; offset < sources.length; offset++) {
      const candidateIdx = (activeServerIndex + offset) % sources.length;
      if (!triedServerIndices.has(candidateIdx)) {
        const pages = buildServerPages(sources, serverBarWidth, detectedQualities);
        serverPage = findPageForSourceIndex(pages, candidateIdx);
        startPlaybackWithProgress(
          candidateIdx,
          activeSeasonIndex,
          activeEpisodeIndex,
          currentVideoTime,
          true
        );
        return;
      }
    }

    if (!proxyFallbackPass && !isBackupApiActive()) {
      proxyFallbackPass = true;
      triedServerIndices.clear();
      const restartIdx =
        failoverStartServerIndex >= 0 && failoverStartServerIndex < sources.length
          ? failoverStartServerIndex
          : 0;
      const pages = buildServerPages(sources, serverBarWidth, detectedQualities);
      serverPage = findPageForSourceIndex(pages, restartIdx);
      startPlaybackWithProgress(
        restartIdx,
        activeSeasonIndex,
        activeEpisodeIndex,
        currentVideoTime,
        true
      );
    }
  }

  function savePlaybackProgress(
    currentTime: number,
    duration: number,
    syncImmediately = false
  ) {
    if (!details || !isPlaying || currentTime <= 0) return;
    const derived = getDerivedState();
    if (!derived.activeServer) return;
    lastSaveTime = Date.now();
    const epLabel = formatEpisodeLabel(
      derived.activeEpisodeObj?.name || "",
      derived.activeEpisodeIndexClamped
    );
    const manualPickMeta = derived.activeServer.isManual
      ? {
          sourceId: derived.activeServer.sourceId,
          vodName: derived.activeServer.vodName,
          keyword:
            (manualQuery || lastSearchQuery || "").trim() ||
            derived.activeServer.vodName,
        }
      : undefined;
    persistWatchHistory(
      details,
      {
        sourceId: derived.activeServer.sourceId,
        seasonNumber: derived.activeServerSeasonGroup?.seasonNumber,
        seasonIndex: derived.activeServerSafeSeasonIdx,
        episodeIndex: derived.activeEpisodeIndexClamped,
        episodeLabel: epLabel,
        currentTime,
        duration,
        manualPick: manualPickMeta,
      },
      syncImmediately
    );
  }

  function flushCurrentPlayback() {
    const videoEl = hlsController?.getVideoElement();
    const t =
      videoEl && videoEl.currentTime > 0 ? videoEl.currentTime : currentVideoTime;
    const dur = videoEl?.duration || 0;
    if (isPlaying && t > 0) {
      savePlaybackProgress(t, dur, true);
    } else {
      flushHistoryProgressSync(true);
    }
  }

  function handleTimeUpdate(currentTime: number, duration: number) {
    currentVideoTime = currentTime;
    const now = Date.now();
    if (now - lastSaveTime < 8000) return;
    savePlaybackProgress(currentTime, duration, false);
  }

  function applyDetectedQuality(sourceId: string, q: string) {
    if (detectedQualities[sourceId] === q) return;
    detectedQualities[sourceId] = q;
    renderServerBar();
  }

  function getResumeButtonLabel(): string | null {
    if (!savedProgress) return null;
    const derived = getDerivedState();
    const timeStr =
      savedProgress.currentTime && savedProgress.currentTime >= 3
        ? formatPlaybackTime(savedProgress.currentTime)
        : null;

    if (type === "tv") {
      const epIdx = savedProgress.episodeIndex ?? 0;
      const epNum = epIdx + 1;
      const epLabelRaw = formatEpisodeLabel(
        savedProgress.episodeLabel || String(epNum),
        epIdx
      );
      const epLabel =
        measureLabelVisualWidth(epLabelRaw) > 12
          ? isZh()
            ? `第${epNum}集`
            : `Ep ${epNum}`
          : epLabelRaw;
      const epPart =
        derived.hasMultipleSeasons && savedProgress.seasonNumber
          ? isZh()
            ? `${t("player.seasonName", {
                season: savedProgress.seasonNumber,
              })}·${epLabel}`
            : `S${savedProgress.seasonNumber}:E${epNum}`
          : epLabel;
      return timeStr
        ? t("player.resumeEpAt", { ep: epPart, time: timeStr })
        : t("player.resumeEp", { ep: epPart });
    }

    return timeStr
      ? t("player.resumeAt", { time: timeStr })
      : t("player.resume");
  }

  function syncStage() {
    if (signal.aborted) return;
    const derived = getDerivedState();
    const isPlayerMounted = Boolean(isPlaying && derived.activeStreamUrl);
    syncUpscaleBtnVisibility(isPlayerMounted);

    // Playing state: maintain active HLS video instance unless URL or proxy pass changed
    if (isPlayerMounted && derived.activeStreamUrl) {
      const nextPlayedKey = `${derived.activeStreamUrl}|${
        proxyFallbackPass ? "proxy" : "direct"
      }`;
      if (hlsController && currentPlayedUrl === nextPlayedKey) {
        return;
      }
      if (hlsController) {
        hlsController.destroy();
        hlsController = null;
      }
      renderedHeroKey = "";
      currentPlayedUrl = nextPlayedKey;

      const videoWrap = document.createElement("div");
      videoWrap.className = "player-video-wrap";
      stageEl.replaceChildren(videoWrap);

      hlsController = createHlsPlayer(videoWrap, {
        src: derived.activeStreamUrl,
        initialTime: initialSeekTime,
        isAnimation: isAnimationTitle(details),
        allowProxyFallback: sources.length <= 1,
        forceProxy: proxyFallbackPass,
        onTimeUpdate: handleTimeUpdate,
        onPersistProgress: (ct, dur) => savePlaybackProgress(ct, dur, false),
        onError: handleStreamError,
        onQualityDetected: (q) => {
          if (signal.aborted || !derived.activeServer) return;
          api.setCachedManifestQuality(derived.activeStreamUrl, q);
          const firstEpUrl = derived.activeServer.episodes?.[0]?.url;
          if (
            firstEpUrl &&
            firstEpUrl !== derived.activeStreamUrl &&
            derived.activeEpisodeIndexClamped === 0
          ) {
            api.setCachedManifestQuality(firstEpUrl, q);
          }
          applyDetectedQuality(derived.activeServer.sourceId, q);
        },
      });
      return;
    }

    // Stopped playing or intro view: destroy active video & buffers immediately
    if (hlsController) {
      hlsController.destroy();
      hlsController = null;
      currentPlayedUrl = "";
    }

    if (!details) {
      if (renderedHeroKey === "skeleton") return;
      renderedHeroKey = "skeleton";

      const heroSkel = document.createElement("div");
      heroSkel.className = "player-hero player-hero--skeleton";
      heroSkel.innerHTML = `<div class="animate-pulse" style="width:100%;height:100%;background:rgba(255,255,255,0.04)"></div><div class="player-backdrop-fade"></div>`;

      const infoSkel = document.createElement("div");
      infoSkel.className = "player-info";
      infoSkel.innerHTML = `
        <div class="animate-pulse" style="height:40px;width:min(420px,75%);border-radius:12px;background:rgba(255,255,255,0.06);margin-bottom:14px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div class="animate-pulse" style="height:18px;width:48px;border-radius:6px;background:rgba(255,255,255,0.05)"></div>
          <div class="animate-pulse" style="height:18px;width:32px;border-radius:6px;background:rgba(255,255,255,0.05)"></div>
          <div class="animate-pulse" style="height:18px;width:56px;border-radius:6px;background:rgba(255,255,255,0.05)"></div>
          <div class="animate-pulse" style="height:18px;width:112px;border-radius:6px;background:rgba(255,255,255,0.05)"></div>
          <div class="animate-pulse" style="height:18px;width:220px;border-radius:6px;background:rgba(255,255,255,0.05)"></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;max-width:48rem">
          <div class="animate-pulse" style="height:16px;width:100%;border-radius:6px;background:rgba(255,255,255,0.05)"></div>
          <div class="animate-pulse" style="height:16px;width:66%;border-radius:6px;background:rgba(255,255,255,0.05)"></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <div class="animate-pulse" style="height:38px;width:96px;border-radius:9999px;background:rgba(255,255,255,0.06)"></div>
          <div class="animate-pulse" style="height:38px;width:92px;border-radius:9999px;background:rgba(255,255,255,0.06)"></div>
        </div>
      `;

      stageEl.replaceChildren(heroSkel, infoSkel);
      return;
    }

    const zhMode = isZh();
    const rawTitle = details.title || details.name || "";
    const englishTitle = details.en_title || rawTitle;
    const fallbackVodZhTitle = cleanDisplayZhTitle(sources[0]?.vodName);
    const chineseTitle = details.zh_title || fallbackVodZhTitle;

    const isChineseDefault = Boolean(
      (zhMode || details.is_chinese_origin) && chineseTitle
    );
    const primaryTitle = isChineseDefault
      ? chineseTitle!
      : englishTitle || rawTitle;
    const secondaryTitle = isChineseDefault
      ? englishTitle && englishTitle !== primaryTitle
        ? englishTitle
        : undefined
      : chineseTitle && chineseTitle !== primaryTitle
      ? chineseTitle
      : undefined;

    // NOTE: Keep /t/p/original on main .player-backdrop (TMDB has no tier between w1280 and original;
    // w1280 softens on 2K/4K/portrait displays). Only the 42px blurred fallback uses w342.
    const hasWideBackdrop = Boolean(details.backdrop_path);
    const backdropPath = details.backdrop_path || details.poster_path;
    const backdropUrl = backdropPath
      ? `https://image.tmdb.org/t/p/original${backdropPath}`
      : "";
    const imdbId = details.imdb_id || details.external_ids?.imdb_id || "";
    const metaHtml = buildMetaRowHtml(details);
    const overviewText = zhMode
      ? details.zh_overview || details.overview || ""
      : details.overview || "";
    const preferredDoubanSource =
      (activeServerIndex !== null ? sources[activeServerIndex] : undefined) ||
      sources.find((s) => Boolean(s.doubanId));
    const doubanId =
      preferredDoubanSource?.doubanId ||
      sources.find((s) => Boolean(s.doubanId))?.doubanId;
    const doubanFallback =
      chineseTitle || details.zh_title || primaryTitle || englishTitle;
    const imdbHref = buildImdbHref(imdbId, englishTitle || primaryTitle);
    const doubanHref = buildDoubanHref(doubanId, doubanFallback);

    const heroAssetKey = `${details.id}|${backdropUrl}|${hasWideBackdrop ? 1 : 0}`;
    const nextHeroKey = `${heroAssetKey}|${primaryTitle}|${secondaryTitle || ""}|${imdbHref}|${doubanHref}|${metaHtml}|${overviewText}`;
    if (renderedHeroKey === nextHeroKey) return;

    // Hydrate metadata/title in-place when hero backdrop element is unchanged to avoid reloading the 4K backdrop
    const existingInfo = stageEl.querySelector(".player-info");
    if (renderedHeroKey.startsWith(`${heroAssetKey}|`) && existingInfo) {
      renderedHeroKey = nextHeroKey;
      const existingTitle = existingInfo.querySelector(".player-title");
      if (existingTitle) {
        updateTitleElement(existingTitle, primaryTitle, secondaryTitle);
      }
      const existingMeta = existingInfo.querySelector(".player-meta-row");
      if (existingMeta) {
        existingMeta.innerHTML = metaHtml;
      }
      const existingOverview = existingInfo.querySelector(".player-overview");
      if (overviewText) {
        if (existingOverview) {
          existingOverview.textContent = overviewText;
        } else {
          const overviewEl = document.createElement("p");
          overviewEl.className = "player-overview";
          overviewEl.textContent = overviewText;
          const actionsEl = existingInfo.querySelector(".player-info-actions");
          if (actionsEl) existingInfo.insertBefore(overviewEl, actionsEl);
          else existingInfo.appendChild(overviewEl);
        }
      } else if (existingOverview) {
        existingOverview.remove();
      }
      const existingImdb = existingInfo.querySelector<HTMLAnchorElement>(".imdb-btn");
      if (existingImdb) {
        existingImdb.href = imdbHref;
      }
      const existingDouban = existingInfo.querySelector<HTMLAnchorElement>(".douban-btn");
      if (existingDouban) {
        existingDouban.href = doubanHref;
        existingDouban.setAttribute("aria-label", t("player.doubanAria"));
        const labelSpan = existingDouban.querySelector(
          ".player-action-btn-inner > span"
        );
        if (labelSpan) labelSpan.textContent = t("player.douban");
      }
      return;
    }

    renderedHeroKey = nextHeroKey;

    const hero = document.createElement("div");
    hero.className = "player-hero";

    if (backdropUrl) {
      let pulseBg: HTMLDivElement | null = null;
      if (!backdropLoaded) {
        pulseBg = document.createElement("div");
        pulseBg.className = "animate-pulse";
        pulseBg.style.cssText =
          "position:absolute;top:0;right:0;bottom:0;left:0;background:rgba(255,255,255,0.04);";
        hero.appendChild(pulseBg);
      }

      let ambientImg: HTMLImageElement | null = null;
      if (!hasWideBackdrop) {
        ambientImg = document.createElement("img");
        ambientImg.src = `https://image.tmdb.org/t/p/w342${backdropPath}`;
        ambientImg.alt = "";
        ambientImg.setAttribute("aria-hidden", "true");
        ambientImg.referrerPolicy = "no-referrer";
        ambientImg.decoding = "async";
        ambientImg.className = backdropLoaded
          ? "player-backdrop-ambient is-loaded"
          : "player-backdrop-ambient";
        hero.appendChild(ambientImg);
      }

      const img = document.createElement("img");
      img.src = backdropUrl;
      img.alt = primaryTitle;
      img.referrerPolicy = "no-referrer";
      img.decoding = "async";
      img.setAttribute("fetchpriority", "high");
      img.className = [
        "player-backdrop",
        hasWideBackdrop ? "" : "player-backdrop--poster",
        backdropLoaded ? "is-loaded" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const markLoaded = () => {
        backdropLoaded = true;
        img.classList.add("is-loaded");
        ambientImg?.classList.add("is-loaded");
        pulseBg?.remove();
        pulseBg = null;
      };
      img.addEventListener("load", markLoaded, { signal, once: true });
      img.addEventListener("error", markLoaded, { signal, once: true });
      hero.appendChild(img);
    }

    const fade = document.createElement("div");
    fade.className = "player-backdrop-fade";
    hero.appendChild(fade);

    const info = document.createElement("div");
    info.className = "player-info";

    const titleEl = document.createElement("h1");
    titleEl.className = "player-title";
    updateTitleElement(titleEl, primaryTitle, secondaryTitle);
    info.appendChild(titleEl);

    const metaRow = document.createElement("div");
    metaRow.className = "player-meta-row tabular-nums";
    metaRow.innerHTML = metaHtml;
    info.appendChild(metaRow);

    if (overviewText) {
      const overviewEl = document.createElement("p");
      overviewEl.className = "player-overview";
      overviewEl.textContent = overviewText;
      info.appendChild(overviewEl);
    }

    const actionsRow = document.createElement("div");
    actionsRow.className = "player-info-actions";

    const watchLaterBtn = document.createElement("button");
    watchLaterBtn.type = "button";
    watchLaterBtn.className = "watch-later-btn";
    watchLaterBtn.tabIndex = 0;
    const renderWatchLaterBtn = (saved: boolean) => {
      watchLaterBtn.classList.toggle("is-saved", saved);
      watchLaterBtn.setAttribute("aria-pressed", String(saved));
      watchLaterBtn.innerHTML = `<span class="player-action-btn-inner">${icons.bookmark(
        "",
        15
      )}<span>${escapeHtml(saved ? t("player.saved") : t("player.save"))}</span></span>`;
    };
    renderWatchLaterBtn(isInWatchLater(type, details.id));
    watchLaterBtn.addEventListener("click", () => {
      if (!details) return;
      const saved = toggleWatchLater({
        id: details.id,
        media_type: type,
        title: details.title,
        name: details.name,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        vote_average: details.vote_average,
        release_date: details.release_date,
        first_air_date: details.first_air_date,
        overview: details.overview,
        en_title: details.en_title,
        zh_title: details.zh_title,
      });
      renderWatchLaterBtn(saved);
    });
    actionsRow.appendChild(watchLaterBtn);

    const imdbLink = document.createElement("a");
    imdbLink.className = "imdb-btn";
    imdbLink.target = "_blank";
    imdbLink.rel = "noopener noreferrer";
    imdbLink.setAttribute("aria-label", t("player.imdbAria"));
    imdbLink.tabIndex = 0;
    imdbLink.href = imdbHref;
    imdbLink.innerHTML = `<span class="player-action-btn-inner"><span>IMDb</span>${icons.externalLink(
      "",
      14
    )}</span>`;
    actionsRow.appendChild(imdbLink);

    const doubanLink = document.createElement("a");
    doubanLink.className = "douban-btn";
    doubanLink.target = "_blank";
    doubanLink.rel = "noopener noreferrer";
    doubanLink.setAttribute("aria-label", t("player.doubanAria"));
    doubanLink.tabIndex = 0;
    doubanLink.href = doubanHref;
    doubanLink.innerHTML = `<span class="player-action-btn-inner"><span>${escapeHtml(
      t("player.douban")
    )}</span>${icons.externalLink("", 14)}</span>`;
    actionsRow.appendChild(doubanLink);

    info.appendChild(actionsRow);

    stageEl.replaceChildren(hero, info);
  }

  function updateTitleElement(
    titleEl: Element,
    primaryTitle: string,
    secondaryTitle?: string
  ) {
    titleEl.replaceChildren();
    const primarySpan = document.createElement("span");
    primarySpan.textContent = primaryTitle;
    primarySpan.addEventListener("click", () => copyTextSilently(primaryTitle));
    titleEl.appendChild(primarySpan);

    if (secondaryTitle) {
      const wrap = document.createElement("span");
      wrap.className = "player-title-secondary";
      wrap.appendChild(document.createTextNode("/ "));
      const secSpan = document.createElement("span");
      secSpan.textContent = secondaryTitle;
      secSpan.addEventListener("click", () => copyTextSilently(secondaryTitle));
      wrap.appendChild(secSpan);
      titleEl.appendChild(wrap);
    }
  }

  function renderServerBar() {
    if (signal.aborted) return;

    // Remember focused server pill or nav button across partial re-renders
    const active = document.activeElement as HTMLElement | null;
    const prevFocusSourceId =
      active && serverBarEl.contains(active) ? active.dataset.sourceId : undefined;
    const prevFocusNav =
      active && serverBarEl.contains(active) ? active.dataset.serverNav : undefined;

    if (resolving) {
      const row = document.createElement("div");
      row.className = "server-bar-row";
      row.style.maxWidth = "100%";
      const list = document.createElement("div");
      list.className = "server-pills-list";
      list.style.overflow = "hidden";
      list.style.minWidth = "0";
      list.style.flex = "1 1 0%";
      list.innerHTML = Array.from({ length: 4 })
        .map(() => `<div class="skeleton-pill animate-pulse"></div>`)
        .join("");
      row.appendChild(list);
      serverBarEl.replaceChildren(row);
      return;
    }

    if (sources.length === 0) {
      const row = document.createElement("div");
      row.className = "server-bar-row";
      row.style.maxWidth = "100%";

      const msg = document.createElement("p");
      msg.style.cssText =
        "margin:0;font-size:13px;color:rgba(255,255,255,0.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;";
      msg.textContent = t("player.noStreams");

      const retryBtn = document.createElement("button");
      retryBtn.type = "button";
      retryBtn.className = "server-pill";
      retryBtn.tabIndex = 0;
      retryBtn.innerHTML = `<span class="server-pill-inner"><span class="server-pill-name">${escapeHtml(
        t("player.retry")
      )}</span></span>`;
      retryBtn.addEventListener("click", () => loadVodStreams(true));

      const searchFallbackBtn = document.createElement("button");
      searchFallbackBtn.type = "button";
      searchFallbackBtn.className = "server-pill";
      searchFallbackBtn.tabIndex = 0;
      searchFallbackBtn.innerHTML = `<span class="server-pill-inner">${icons.search(
        "",
        13
      )}<span class="server-pill-name">${escapeHtml(
        t("player.searchFallback")
      )}</span></span>`;
      searchFallbackBtn.addEventListener("click", () => {
        isEpisodePopoverOpen = true;
        isManualPickerOpen = true;
        const defaultKw =
          manualQuery ||
          lastSearchQuery ||
          details?.zh_title ||
          details?.en_title ||
          details?.title ||
          details?.name ||
          "";
        if (defaultKw && !manualSearchedOnce) {
          manualQuery = defaultKw;
          runManualSearch(defaultKw);
        } else {
          renderActionsRight();
        }
      });

      row.append(msg, retryBtn, searchFallbackBtn);
      serverBarEl.replaceChildren(row);
      return;
    }

    const serverPages = buildServerPages(
      sources,
      serverBarWidth,
      detectedQualities
    );
    const totalServerPages = serverPages.length;
    if (serverPage >= totalServerPages && totalServerPages > 0) {
      serverPage = Math.max(0, totalServerPages - 1);
    }

    const visiblePageItems = serverPages[serverPage]?.items || [];
    const showServerPrev = serverPage > 0;
    const showServerNext = serverPage < totalServerPages - 1;

    const row = document.createElement("div");
    row.className = "server-bar-row";

    const list = document.createElement("div");
    list.className = "server-pills-list";

    visiblePageItems.forEach(({ src, absoluteIndex }) => {
      const isSelected = isPlaying && activeServerIndex === absoluteIndex;
      const isHighPing = src.latencyMs >= HIGH_PING_THRESHOLD_MS;
      const effectiveQuality =
        detectedQualities[src.sourceId] || src.quality || "1080P";
      const label = formatServerLabel(src);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.tabIndex = 0;
      btn.dataset.sourceId = src.sourceId;
      btn.className = [
        "server-pill",
        isSelected ? "is-selected" : "",
        isHighPing ? "is-high-ping" : "",
      ]
        .filter(Boolean)
        .join(" ");
      btn.title = isHighPing
        ? `${label} (${effectiveQuality} · ${src.latencyMs}ms - ${t("player.highPing")})`
        : `${label} (${effectiveQuality} · ${src.latencyMs}ms)`;

      const qualityClass =
        effectiveQuality === "4K"
          ? "quality-badge quality-badge--4k tabular-nums"
          : effectiveQuality === "2K"
          ? "quality-badge quality-badge--2k tabular-nums"
          : "quality-badge tabular-nums";

      btn.innerHTML = `
        <span class="server-pill-inner">
          <span class="server-pill-name">${escapeHtml(label)}</span>
          <span class="${qualityClass}">${escapeHtml(effectiveQuality)}</span>
          <span class="latency-label tabular-nums">${src.latencyMs}ms</span>
        </span>
      `;
      btn.addEventListener("click", () => {
        selectedUnloadedSeasonNum = null;
        const seekTime = isPlaying ? currentVideoTime : 0;
        const currentSeasonNum = getDerivedState().currentSeasonGroup?.seasonNumber;
        const nextSeasons = src.seasons || [];
        let nextSeasonIdx = activeSeasonIndex;
        if (nextSeasons.length > 0 && currentSeasonNum !== undefined) {
          const matchedIdx = nextSeasons.findIndex(
            (s) => s.seasonNumber === currentSeasonNum
          );
          if (matchedIdx >= 0) nextSeasonIdx = matchedIdx;
        }
        startPlaybackWithProgress(
          absoluteIndex,
          nextSeasonIdx,
          activeEpisodeIndex,
          seekTime
        );
      });
      list.appendChild(btn);
    });

    row.appendChild(list);

    if (totalServerPages > 1) {
      const navGroup = document.createElement("div");
      navGroup.className = "server-nav-group";

      const prevSrvBtn = document.createElement("button");
      prevSrvBtn.type = "button";
      prevSrvBtn.className = "server-nav-btn";
      prevSrvBtn.dataset.serverNav = "prev";
      prevSrvBtn.disabled = !showServerPrev;
      prevSrvBtn.setAttribute("aria-label", t("player.prevServersAria"));
      prevSrvBtn.innerHTML = icons.chevronLeft("server-nav-icon");
      prevSrvBtn.addEventListener("click", () => {
        if (serverPage > 0) {
          serverPage -= 1;
          renderServerBar();
        }
      });

      const nextSrvBtn = document.createElement("button");
      nextSrvBtn.type = "button";
      nextSrvBtn.className = "server-nav-btn";
      nextSrvBtn.dataset.serverNav = "next";
      nextSrvBtn.disabled = !showServerNext;
      nextSrvBtn.setAttribute("aria-label", t("player.nextServersAria"));
      nextSrvBtn.innerHTML = icons.chevronRight("server-nav-icon");
      nextSrvBtn.addEventListener("click", () => {
        if (serverPage < totalServerPages - 1) {
          serverPage += 1;
          renderServerBar();
        }
      });

      navGroup.append(prevSrvBtn, nextSrvBtn);
      row.appendChild(navGroup);
    }

    serverBarEl.replaceChildren(row);

    if (prevFocusSourceId) {
      const target = serverBarEl.querySelector<HTMLElement>(
        `[data-source-id="${CSS.escape(prevFocusSourceId)}"]`
      );
      target?.focus({ preventScroll: true });
    } else if (prevFocusNav) {
      const target = serverBarEl.querySelector<HTMLButtonElement>(
        `[data-server-nav="${prevFocusNav}"]`
      );
      if (target && !target.disabled) {
        target.focus({ preventScroll: true });
      } else {
        const altNav = prevFocusNav === "next" ? "prev" : "next";
        const fallbackBtn =
          serverBarEl.querySelector<HTMLButtonElement>(
            `[data-server-nav="${altNav}"]`
          ) ||
          serverBarEl.querySelector<HTMLButtonElement>(".server-pill");
        if (fallbackBtn && !fallbackBtn.disabled) {
          fallbackBtn.focus({ preventScroll: true });
        }
      }
    }
  }

  function renderActionsRight() {
    if (signal.aborted) return;

    const derived = getDerivedState();
    const resumeLabel = getResumeButtonLabel();
    const isAlreadyPlayingSavedSpot =
      isPlaying &&
      savedProgress !== null &&
      activeSeasonIndex === (savedProgress.seasonIndex ?? 0) &&
      activeEpisodeIndex === (savedProgress.episodeIndex ?? 0);

    const hasPendingResume =
      savedProgress !== null &&
      resumeLabel !== null &&
      !isAlreadyPlayingSavedSpot;

    const showResumePill =
      !resolving && sources.length > 0 && hasPendingResume;

    const frag = document.createDocumentFragment();

    if (showResumePill && resumeLabel) {
      const resumeBtn = document.createElement("button");
      resumeBtn.type = "button";
      resumeBtn.className = "resume-pill tabular-nums";
      resumeBtn.tabIndex = 0;
      resumeBtn.innerHTML = `<span class="episodes-trigger-inner">${icons.play(
        "",
        12
      )}<span>${escapeHtml(resumeLabel)}</span></span>`;
      resumeBtn.addEventListener("click", handleResumeClick);
      frag.appendChild(resumeBtn);
    }

    popoverWrapRef = null;

    if (resolving) {
      if (hasPendingResume) {
        const skelResume = document.createElement("div");
        skelResume.className = "skeleton-pill animate-pulse";
        skelResume.style.width = "136px";
        frag.appendChild(skelResume);
      }
      const skelBtn = document.createElement("div");
      skelBtn.className = "skeleton-pill animate-pulse";
      skelBtn.style.width = "128px";
      frag.appendChild(skelBtn);
    } else if (
      (!resolving &&
        derived.episodeSourceServer &&
        derived.episodes.length > 0) ||
      isManualPickerOpen
    ) {
      const wrap = document.createElement("div");
      wrap.className = "episodes-popover-wrap";
      popoverWrapRef = wrap;

      const hasPlayableList = Boolean(
        derived.episodeSourceServer && derived.episodes.length > 0
      );

      if (hasPlayableList) {
        const triggerBtn = document.createElement("button");
        triggerBtn.type = "button";
        triggerBtn.className = "episodes-trigger-btn";
        triggerBtn.tabIndex = 0;
        const triggerTitle =
          derived.hasMultipleSeasons && derived.currentSeasonGroup
            ? t("player.seasonEpisodes", {
                season: derived.currentSeasonGroup.seasonNumber,
              })
            : t("player.episodes");

        triggerBtn.innerHTML = `
          <span class="episodes-trigger-inner">
            ${icons.layers("", 14)}
            <span>${escapeHtml(triggerTitle)}</span>
            <span class="tabular-nums" style="font-family:ui-monospace,monospace;font-size:12px;line-height:1;color:rgba(0,0,0,0.65)">${
              derived.safeEpisodeIndex + 1
            }/${derived.episodes.length}</span>
            ${icons.chevronUp("", 14)}
          </span>
        `;
        const chevronEl = triggerBtn.querySelector("svg:last-of-type");
        if (chevronEl instanceof SVGElement) {
          chevronEl.style.transition = "transform 300ms ease";
          chevronEl.style.transform = isEpisodePopoverOpen
            ? "rotate(180deg)"
            : "";
        }

        triggerBtn.addEventListener("click", () => {
          isEpisodePopoverOpen = !isEpisodePopoverOpen;
          if (!isEpisodePopoverOpen) {
            isManualPickerOpen = false;
          } else {
            shouldScrollActiveEp = true;
          }
          renderActionsRight();
        });
        wrap.appendChild(triggerBtn);
      }

      if (isEpisodePopoverOpen || isManualPickerOpen) {
        const formattedLabels = derived.episodes.map((ep, idx) =>
          formatEpisodeLabel(ep.name, idx)
        );
        const layoutMode = isManualPickerOpen
          ? "wide"
          : getEpisodeLayoutMode(formattedLabels);
        const canReverseSort =
          !isManualPickerOpen && derived.episodes.length >= 24;
        const effectiveSortDesc = canReverseSort && episodeSortDesc;

        const popover = document.createElement("div");
        popover.className =
          layoutMode === "compact"
            ? "episodes-popover"
            : "episodes-popover episodes-popover--wide";

        const header = document.createElement("div");
        header.className = "episodes-popover-header";
        const headerTitleText = isManualPickerOpen
          ? t("player.manualSearchTitle")
          : derived.episodeSourceServer?.isManual &&
            derived.episodeSourceServer.vodName
          ? derived.episodeSourceServer.vodName
          : derived.hasMultipleSeasons
          ? t("player.selectSeasonEpisode")
          : t("player.selectEpisode");
        const headerCountHtml = isManualPickerOpen
          ? ""
          : `<span class="tabular-nums" style="font-size:12px;font-family:ui-monospace,monospace;color:rgba(255,255,255,0.5);flex-shrink:0">&middot; ${escapeHtml(
              t("player.epsCount", { count: derived.episodes.length })
            )}</span>`;
        header.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;min-width:0">
            <span style="font-size:14px;font-weight:700;color:#ffffff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(
              headerTitleText
            )}</span>
            ${headerCountHtml}
          </div>
        `;

        const headerActions = document.createElement("div");
        headerActions.className = "episodes-popover-actions";

        if (canReverseSort) {
          const sortBtn = document.createElement("button");
          sortBtn.type = "button";
          sortBtn.dataset.epSort = "true";
          sortBtn.className = effectiveSortDesc
            ? "episodes-popover-action is-active"
            : "episodes-popover-action";
          const sortLabel = effectiveSortDesc
            ? t("player.sortOldestAria")
            : t("player.sortNewestAria");
          sortBtn.setAttribute("aria-label", sortLabel);
          sortBtn.setAttribute("aria-pressed", String(effectiveSortDesc));
          sortBtn.title = sortLabel;
          sortBtn.innerHTML = `<span class="popover-icon-inner">${icons.arrowUpDown(
            "",
            15
          )}</span>`;
          sortBtn.addEventListener("click", () => {
            const wasFocused = document.activeElement === sortBtn;
            episodeSortDesc = !episodeSortDesc;
            shouldScrollActiveEp = false;
            renderActionsRight();
            if (wasFocused) {
              actionsRightEl
                .querySelector<HTMLElement>("[data-ep-sort]")
                ?.focus({ preventScroll: true });
            }
          });
          headerActions.appendChild(sortBtn);
        }

        if (manualOverrideSource) {
          const resetBtn = document.createElement("button");
          resetBtn.type = "button";
          resetBtn.dataset.manualResetBtn = "true";
          resetBtn.className = "episodes-popover-action";
          resetBtn.setAttribute("aria-label", t("player.resetManualAria"));
          resetBtn.title = t("player.resetManualAria");
          resetBtn.innerHTML = `<span class="popover-icon-inner">${icons.arrowLeft(
            "",
            15
          )}</span>`;
          resetBtn.addEventListener("click", () => resetManualSource());
          headerActions.appendChild(resetBtn);
        }

        const manualBtn = document.createElement("button");
        manualBtn.type = "button";
        manualBtn.dataset.manualSearchBtn = "true";
        manualBtn.className = isManualPickerOpen
          ? "episodes-popover-action is-active"
          : "episodes-popover-action";
        manualBtn.setAttribute("aria-label", t("player.manualSearchAria"));
        manualBtn.setAttribute("aria-pressed", String(isManualPickerOpen));
        manualBtn.title = t("player.manualSearchAria");
        manualBtn.innerHTML = `<span class="popover-icon-inner">${icons.search(
          "",
          14
        )}</span>`;
        manualBtn.addEventListener("click", () => {
          isManualPickerOpen = !isManualPickerOpen;
          if (isManualPickerOpen) {
            isEpisodePopoverOpen = true;
            const defaultKw =
              manualQuery ||
              lastSearchQuery ||
              details?.zh_title ||
              details?.en_title ||
              details?.title ||
              details?.name ||
              "";
            if (defaultKw && !manualSearchedOnce) {
              manualQuery = defaultKw;
              runManualSearch(defaultKw);
              return;
            }
          } else if (!hasPlayableList) {
            isEpisodePopoverOpen = false;
          }
          renderActionsRight();
        });
        headerActions.appendChild(manualBtn);

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "episodes-popover-close";
        closeBtn.setAttribute("aria-label", t("player.closeEpisodesAria"));
        closeBtn.innerHTML = `<span class="popover-icon-inner">${icons.x(
          "",
          16,
          2
        )}</span>`;
        closeBtn.addEventListener("click", () => {
          isEpisodePopoverOpen = false;
          isManualPickerOpen = false;
          renderActionsRight();
        });
        headerActions.appendChild(closeBtn);
        header.appendChild(headerActions);
        popover.appendChild(header);

        let seasonBarRef: HTMLDivElement | null = null;
        let epGridRef: HTMLDivElement | null = null;

        if (isManualPickerOpen) {
          const searchForm = document.createElement("form");
          searchForm.className = "manual-search-form";
          const inputEl = document.createElement("input");
          inputEl.type = "text";
          inputEl.id = "manual-search-input";
          inputEl.name = "manualSearch";
          inputEl.className = "manual-search-input";
          inputEl.placeholder = t("player.manualSearchPlaceholder");
          inputEl.value = manualQuery;
          inputEl.addEventListener("input", () => {
            manualQuery = inputEl.value;
          });
          const submitBtn = document.createElement("button");
          submitBtn.type = "submit";
          submitBtn.className = "manual-search-submit";
          submitBtn.innerHTML = `<span class="manual-search-submit-inner">${escapeHtml(
            t("player.manualSearchBtn")
          )}</span>`;
          searchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            runManualSearch(inputEl.value);
          });
          searchForm.append(inputEl, submitBtn);
          popover.appendChild(searchForm);

          const matchList = document.createElement("div");
          matchList.className = "manual-match-list no-scrollbar";
          if (manualLoading) {
            const statusEl = document.createElement("div");
            statusEl.className = "manual-empty-state";
            statusEl.textContent = t("player.manualSearching");
            matchList.appendChild(statusEl);
          } else if (manualResults.length === 0) {
            const emptyEl = document.createElement("div");
            emptyEl.className = "manual-empty-state";
            emptyEl.textContent = t("player.manualNoMatches");
            matchList.appendChild(emptyEl);
          } else {
            for (const item of manualResults) {
              const rowBtn = document.createElement("button");
              rowBtn.type = "button";
              rowBtn.className = "manual-match-item";
              const metaBits = [
                item.sourceName,
                item.vodYear,
                item.vodRemarks,
                t("player.epsCount", { count: item.episodes.length }),
              ]
                .filter(Boolean)
                .join(" · ");
              rowBtn.innerHTML = `
                <span class="manual-match-inner">
                  <span class="manual-match-title">${escapeHtml(item.vodName)}</span>
                  <span class="manual-match-meta tabular-nums">${escapeHtml(metaBits)}</span>
                </span>
              `;
              rowBtn.addEventListener("click", () => applyManualSource(item));
              matchList.appendChild(rowBtn);
            }
          }
          popover.appendChild(matchList);
        } else {
          if (derived.hasMultipleSeasons) {
            const seasonBar = document.createElement("div");
            seasonBar.className = "season-bar no-scrollbar";
            derived.displaySeasons.forEach((season) => {
              const sBtn = document.createElement("button");
              sBtn.type = "button";
              const isSelectedUnloaded =
                season.unloaded &&
                selectedUnloadedSeasonNum === season.seasonNumber;
              const matchedIdx = derived.seasons.findIndex(
                (ms) => ms.seasonNumber === season.seasonNumber
              );
              const isActive =
                !season.unloaded &&
                selectedUnloadedSeasonNum === null &&
                derived.safeSeasonIndex === matchedIdx;
              sBtn.className = [
                "season-btn tabular-nums",
                isActive ? "is-active" : "",
                season.unloaded ? "is-unloaded" : "",
                isSelectedUnloaded ? "is-loading-target" : "",
              ]
                .filter(Boolean)
                .join(" ");
              sBtn.tabIndex = 0;
              const sLabel = isZh()
                ? t("player.seasonName", { season: season.seasonNumber })
                : season.name;
              sBtn.innerHTML = `<span class="season-btn-inner">${escapeHtml(
                sLabel
              )}</span>`;
              sBtn.addEventListener("click", () => {
                if (season.unloaded) {
                  loadMissingSeason(season.seasonNumber);
                  return;
                }
                selectedUnloadedSeasonNum = null;
                activeSeasonIndex = matchedIdx >= 0 ? matchedIdx : 0;
                activeEpisodeIndex = 0;
                renderActionsRight();
              });
              seasonBar.appendChild(sBtn);
            });
            seasonBarRef = seasonBar;
            popover.appendChild(seasonBar);
          }

          if (
            selectedUnloadedSeasonNum !== null &&
            loadingSeasonNum === selectedUnloadedSeasonNum
          ) {
            const loadingEl = document.createElement("div");
            loadingEl.className = "manual-empty-state";
            loadingEl.textContent = t("player.loadingSeason", {
              season: selectedUnloadedSeasonNum,
            });
            popover.appendChild(loadingEl);
          } else if (
            selectedUnloadedSeasonNum !== null &&
            missingSeasonEmpty.has(selectedUnloadedSeasonNum)
          ) {
            const emptySeasonEl = document.createElement("div");
            emptySeasonEl.className = "manual-empty-state";
            emptySeasonEl.textContent = t("player.seasonNotFound", {
              season: selectedUnloadedSeasonNum,
            });
            popover.appendChild(emptySeasonEl);
          } else {
            const epGrid = document.createElement("div");
            epGrid.className =
              layoutMode === "compact"
                ? "episodes-grid no-scrollbar"
                : `episodes-grid episodes-grid--${layoutMode} no-scrollbar`;

            const totalEps = derived.episodes.length;
            for (let step = 0; step < totalEps; step++) {
              const idx = effectiveSortDesc ? totalEps - 1 - step : step;
              const isCurrentEp = isPlaying && derived.safeEpisodeIndex === idx;
              const epLabel = formattedLabels[idx];
              const epBtn = document.createElement("button");
              epBtn.type = "button";
              epBtn.className = isCurrentEp
                ? "episode-btn is-active tabular-nums"
                : "episode-btn tabular-nums";
              epBtn.title = epLabel;
              epBtn.tabIndex = 0;
              if (layoutMode === "list") {
                const labelSpan = document.createElement("span");
                labelSpan.className = "episode-btn-inner episode-btn-label";
                labelSpan.textContent = epLabel;
                epBtn.appendChild(labelSpan);
              } else {
                const innerSpan = document.createElement("span");
                innerSpan.className = "episode-btn-inner";
                innerSpan.textContent = epLabel;
                epBtn.appendChild(innerSpan);
              }
              epBtn.addEventListener("click", () => {
                const targetServerIdx =
                  activeServerIndex !== null ? activeServerIndex : 0;
                isEpisodePopoverOpen = false;
                startPlaybackWithProgress(
                  targetServerIdx,
                  derived.safeSeasonIndex,
                  idx,
                  0
                );
              });
              epGrid.appendChild(epBtn);
            }
            epGridRef = epGrid;
            popover.appendChild(epGrid);
          }
        }

        wrap.appendChild(popover);

        if (shouldScrollActiveEp && !isManualPickerOpen) {
          shouldScrollActiveEp = false;
          window.requestAnimationFrame(() => {
            if (signal.aborted) return;
            if (seasonBarRef && seasonBarRef.scrollHeight > seasonBarRef.clientHeight) {
              const activeSeasonBtn =
                seasonBarRef.querySelector<HTMLElement>(".season-btn.is-active");
              if (activeSeasonBtn) {
                const sbRect = seasonBarRef.getBoundingClientRect();
                const sBtnRect = activeSeasonBtn.getBoundingClientRect();
                const targetSeasonTop =
                  seasonBarRef.scrollTop +
                  (sBtnRect.top - sbRect.top) -
                  Math.max(0, (seasonBarRef.clientHeight - sBtnRect.height) / 2);
                seasonBarRef.scrollTop = Math.max(0, targetSeasonTop);
              }
            }
            if (!epGridRef) return;
            const activeBtn =
              epGridRef.querySelector<HTMLElement>(".episode-btn.is-active");
            if (!activeBtn) return;
            const epRect = epGridRef.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            const targetTop =
              epGridRef.scrollTop +
              (btnRect.top - epRect.top) -
              Math.max(0, (epGridRef.clientHeight - btnRect.height) / 2);
            epGridRef.scrollTop = Math.max(0, targetTop);
          });
        }
      }

      frag.appendChild(wrap);
    }

    actionsRightEl.replaceChildren(frag);
  }

  function renderBottomBar() {
    renderServerBar();
    renderActionsRight();
  }

  // Outside click closes episode popover
  window.addEventListener(
    "mousedown",
    (e) => {
      if (
        isEpisodePopoverOpen &&
        popoverWrapRef &&
        !popoverWrapRef.contains(e.target as Node)
      ) {
        isEpisodePopoverOpen = false;
        renderActionsRight();
      }
    },
    { signal }
  );

  // Escape / Back closes episode popover first, otherwise invokes handleBack()
  window.addEventListener(
    "keydown",
    (e) => {
      if (
        e.key === "Escape" ||
        e.key === "BrowserBack" ||
        e.key === "GoBack" ||
        e.keyCode === 10009 ||
        e.key === "XF86Back"
      ) {
        if (
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement
        ) {
          return;
        }
        e.preventDefault();
        if (isEpisodePopoverOpen) {
          isEpisodePopoverOpen = false;
          renderActionsRight();
          return;
        }
        handleBack();
      }
    },
    { signal }
  );

  // Allow mouse-wheel / trackpad scrolling to flip server pages (< >), matching browse page wheel pagination
  let lastServerWheelTime = 0;
  const SERVER_WHEEL_COOLDOWN_MS = 280;
  root.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      if (resolving || sources.length === 0) return;

      const target = e.target as HTMLElement | null;
      if (target?.closest?.(".episodes-popover, .modal-backdrop")) {
        return;
      }
      // While video is playing, only wheel-paginate servers when pointer is over the bottom server bar
      if (isPlaying && !target?.closest?.(".player-bottom-bar")) {
        return;
      }

      const delta =
        Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 15) return;

      const now = Date.now();
      if (now - lastServerWheelTime < SERVER_WHEEL_COOLDOWN_MS) return;

      const serverPages = buildServerPages(
        sources,
        serverBarWidth,
        detectedQualities
      );
      const totalServerPages = serverPages.length;
      if (totalServerPages <= 1) return;

      if (delta > 0 && serverPage < totalServerPages - 1) {
        lastServerWheelTime = now;
        serverPage += 1;
        renderServerBar();
      } else if (delta < 0 && serverPage > 0) {
        lastServerWheelTime = now;
        serverPage -= 1;
        renderServerBar();
      }
    },
    { passive: true, signal }
  );

  // Observe server bar width for responsive single-row server pagination
  let resizeObserver: ResizeObserver | null = null;
  const updateServerBarWidth = () => {
    const nextW = serverBarEl.clientWidth;
    if (nextW > 0 && nextW !== serverBarWidth) {
      serverBarWidth = nextW;
      renderServerBar();
    }
  };
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(updateServerBarWidth);
    resizeObserver.observe(serverBarEl);
  } else {
    window.addEventListener("resize", updateServerBarWidth, { signal });
  }

  // Initial synchronous render (zero skeleton if prefetched!)
  if (details) {
    syncHeadMeta();
  }
  syncStage();
  renderBottomBar();
  updateServerBarWidth();
  void preloadHlsLibrary();

  // Flush playback progress cleanly when tab hides or page is left
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") {
        flushCurrentPlayback();
      }
    },
    { signal }
  );
  window.addEventListener("pagehide", flushCurrentPlayback, { signal });

  // Pre-warm primary m3u8 manifest if sources came from prefetch cache
  if (sources.length > 0) {
    prewarmStreamManifests(sources, signal, (sourceId, q) => {
      if (signal.aborted) return;
      applyDetectedQuality(sourceId, q);
    });
  }

  // Fetch full details if not already cached (even when preview rendered immediately)
  if (!fullDetails) {
    api
      .getDetails(type, id, signal)
      .then((data) => {
        if (signal.aborted) return;
        fullDetails = data;
        details = data;
        hlsController?.setUpscaleAnimation(isAnimationTitle(details));
        syncHeadMeta();
        syncStage();
        renderBottomBar();
      })
      .catch(() => {});
  }

  function loadVodStreams(bypassCache = false) {
    if (signal.aborted) return;
    const wasResolving = resolving;
    resolving = true;
    if (!wasResolving) {
      renderServerBar();
    }
    api
      .resolveVodStreams(type, id, undefined, [], signal, bypassCache)
      .then((res) => {
        if (signal.aborted) return;
        defaultSources = res.sources || [];
        rebuildSourcesList();
        tmdbSeasonsMeta = res.tmdbSeasons || [];
        lastSearchQuery = res.searchQuery || lastSearchQuery;
        defaultSources.forEach((src) => {
          const q = api.getCachedManifestQuality(src.episodes?.[0]?.url);
          if (q) detectedQualities[src.sourceId] = q;
        });
        resolving = false;
        syncStage();
        renderBottomBar();
        prewarmStreamManifests(defaultSources, signal, (sourceId, q) => {
          if (signal.aborted) return;
          applyDetectedQuality(sourceId, q);
        });
      })
      .catch(() => {
        if (signal.aborted) return;
        defaultSources = [];
        rebuildSourcesList();
        resolving = false;
        renderBottomBar();
      });
  }

  // Fetch VOD stream sources if not already cached
  if (!cachedVod) {
    loadVodStreams(false);
  }
  restoreManualPickFromProgress();

  return {
    destroy() {
      flushCurrentPlayback();
      ac.abort();
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (hlsController) {
        hlsController.destroy();
        hlsController = null;
      }
      currentPlayedUrl = "";
      restoreHeadMeta();
      container.replaceChildren();
    },
  };
}
