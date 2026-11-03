import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  MediaDetails,
  MediaItem,
  ResolvedStreamSource,
  WatchProgress,
} from "../types";
import { HlsPlayer } from "../components/HlsPlayer";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Layers,
  ChevronUp,
  Play,
  X,
} from "lucide-react";
import { cn } from "../utils";

// VOD APIs responding >= 800ms indicate high latency / slow stream segment delivery
const HIGH_PING_THRESHOLD_MS = 800;

function formatEpisodeLabel(rawName: string, index: number): string {
  const trimmed = rawName.trim();
  if (!trimmed) return `Ep ${index + 1}`;

  // Match Chinese episode patterns like "第01集", "第1集", "第12期"
  const epMatch = trimmed.match(/^第\s*0*(\d+)\s*[集期话回]$/);
  if (epMatch) {
    return `Ep ${epMatch[1]}`;
  }

  // Match pure numbers like "01", "1"
  if (/^\d+$/.test(trimmed)) {
    return `Ep ${parseInt(trimmed, 10)}`;
  }

  // Common movie full-stream labels
  if (/^(正片|高清|超清|蓝光|HD|Full|BD|TC|1080[pP]|720[pP]|4[kK])$/i.test(trimmed)) {
    return trimmed
      .replace("正片", "Full")
      .replace("高清", "HD")
      .replace("超清", "FHD")
      .replace("蓝光", "Blu-ray");
  }

  if (trimmed.includes("预告")) {
    return "Trailer";
  }

  return trimmed;
}

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
    .replace(/\s*[(（【[]?\s*(粤语版?|国语版?|普通话版?|粤语配音|国语配音|中字|高清|超清|HD|BD|1080P)\s*[)）】\]]?\s*$/gi, "")
    .replace(/[\s\-·:：/_]*(粤语版?|国语版?|普通话版?|粤语配音|国语配音|粤语|国语|普通话)\s*$/gi, "")
    .replace(/\s*第\s*[一二两三四五六七八九十\d]+\s*[季部]\s*$/, "")
    .replace(/\s*(?:Season\s*\d+|S\d+)\s*$/i, "")
    .trim();
}

function estimatePillSlotWidth(src: ResolvedStreamSource): number {
  const label = `${src.sourceName}${src.audioLang ? ` · ${src.audioLang}` : ""}`;
  let textWidth = 0;
  for (const ch of label) {
    textWidth += /[\u4e00-\u9fff]/.test(ch) ? 14.5 : 8;
  }
  const latencyStr = `${src.latencyMs}ms`;
  const latencyWidth = latencyStr.length * 7;
  // 34px padding+border + textWidth + 8px inner gap + latencyWidth + 10px flex gap + 8px buffer
  return Math.ceil(34 + textWidth + 8 + latencyWidth + 18);
}

interface ServerPageGroup {
  items: { src: ResolvedStreamSource; absoluteIndex: number }[];
}

function buildServerPages(
  sources: ResolvedStreamSource[],
  availableWidth: number
): ServerPageGroup[] {
  if (sources.length === 0) return [];

  const totalWidthAll = sources.reduce(
    (sum, s) => sum + estimatePillSlotWidth(s),
    0
  );
  if (totalWidthAll <= availableWidth - 8) {
    return [
      {
        items: sources.map((src, absoluteIndex) => ({ src, absoluteIndex })),
      },
    ];
  }

  // Reserve 108px for the Prev/Next circular buttons + gap + breathing room
  const maxRowWidth = Math.max(160, availableWidth - 108);
  const pages: ServerPageGroup[] = [];
  let currentItems: { src: ResolvedStreamSource; absoluteIndex: number }[] = [];
  let currentWidth = 0;

  sources.forEach((src, absoluteIndex) => {
    const w = estimatePillSlotWidth(src);
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

export function Player() {
  const { type, id } = useParams<{ type: "movie" | "tv"; id: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [sources, setSources] = useState<ResolvedStreamSource[]>([]);
  const [resolving, setResolving] = useState(true);

  const [activeServerIndex, setActiveServerIndex] = useState<number | null>(null);
  const [activeSeasonIndex, setActiveSeasonIndex] = useState(0);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEpisodePopoverOpen, setIsEpisodePopoverOpen] = useState(false);

  const [savedProgress, setSavedProgress] = useState<WatchProgress | null>(null);
  const [initialSeekTime, setInitialSeekTime] = useState<number>(0);
  const lastSaveTimeRef = useRef<number>(0);
  const currentVideoTimeRef = useRef<number>(0);

  const [serverPage, setServerPage] = useState(0);
  const serverBarRef = useRef<HTMLDivElement>(null);
  const [serverBarWidth, setServerBarWidth] = useState<number>(() =>
    typeof window !== "undefined" ? Math.max(320, window.innerWidth - 420) : 800
  );

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = serverBarRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (serverBarRef.current) {
        setServerBarWidth(serverBarRef.current.clientWidth);
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateWidth();
      });
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
  }, [details, resolving, sources.length, savedProgress, isPlaying]);

  const serverPages = buildServerPages(sources, serverBarWidth);
  const totalServerPages = serverPages.length;

  useEffect(() => {
    if (serverPage >= totalServerPages && totalServerPages > 0) {
      setServerPage(Math.max(0, totalServerPages - 1));
    }
  }, [sources.length, totalServerPages, serverPage]);

  const persistWatchHistory = useCallback(
    (
      mediaDetails: MediaDetails | null,
      progressUpdate: WatchProgress
    ) => {
      if (!mediaDetails || !type || !id) return;
      try {
        const stored = localStorage.getItem("watch_history");
        let history: MediaItem[] = stored ? JSON.parse(stored) : [];
        const existingItem = history.find((item) => item.id.toString() === id);
        const mergedProgress: WatchProgress = {
          ...(existingItem?.watchProgress || {}),
          ...progressUpdate,
          updatedAt: Date.now(),
        };
        history = history.filter((item) => item.id.toString() !== id);
        history.unshift({
          ...(mediaDetails as MediaItem),
          media_type: type,
          watchProgress: mergedProgress,
        });
        localStorage.setItem(
          "watch_history",
          JSON.stringify(history.slice(0, 20))
        );
        setSavedProgress(mergedProgress);
      } catch {}
    },
    [type, id]
  );

  const fetchVodStreams = useCallback(async () => {
    if (!type || !id) return;
    setResolving(true);
    try {
      const res = await api.resolveVodStreams(type, id);
      const list = res.sources || [];
      setSources(list);
      setActiveServerIndex(null);
      setActiveSeasonIndex(0);
      setActiveEpisodeIndex(0);
      setServerPage(0);
    } catch {
      setSources([]);
    } finally {
      setResolving(false);
    }
  }, [type, id]);

  useEffect(() => {
    if (type && id) {
      setDetails(null);
      setIsPlaying(false);
      setActiveServerIndex(null);
      setActiveSeasonIndex(0);
      setActiveEpisodeIndex(0);
      setInitialSeekTime(0);
      currentVideoTimeRef.current = 0;
      setServerPage(0);
      setIsEpisodePopoverOpen(false);

      // Load existing watchProgress from watch_history if previously watched
      try {
        const stored = localStorage.getItem("watch_history");
        const history: MediaItem[] = stored ? JSON.parse(stored) : [];
        const existing = history.find((item) => item.id.toString() === id);
        setSavedProgress(existing?.watchProgress || null);
      } catch {
        setSavedProgress(null);
      }

      api.getDetails(type, id).then((data) => {
        setDetails(data);
      });

      fetchVodStreams();
    }
  }, [type, id, fetchVodStreams]);

  // Close episode popover on outside click
  useEffect(() => {
    if (!isEpisodePopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsEpisodePopoverOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isEpisodePopoverOpen]);

  const handleBack = () => {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (isPlaying) {
      setIsPlaying(false);
      setActiveServerIndex(null);
      setIsEpisodePopoverOpen(false);
      return;
    }
    const fallbackPath = sessionStorage.getItem("last_browse_path") || "/";
    const canGoBackInRouter =
      typeof window !== "undefined" &&
      window.history.state &&
      typeof window.history.state.idx === "number" &&
      window.history.state.idx > 0;

    if (canGoBackInRouter) {
      const currentUrl = window.location.pathname;
      navigate(-1);
      window.setTimeout(() => {
        if (window.location.pathname === currentUrl) {
          navigate(fallbackPath, { replace: true });
        }
      }, 60);
    } else {
      navigate(fallbackPath);
    }
  };

  if (!details) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const rawTitle = details.title || details.name || "";
  const englishTitle = details.en_title || rawTitle;
  const fallbackVodZhTitle = cleanDisplayZhTitle(sources[0]?.vodName);
  const chineseTitle = details.zh_title || fallbackVodZhTitle;

  const isChineseDefault = Boolean(details.is_chinese_origin && chineseTitle);
  const primaryTitle = isChineseDefault ? chineseTitle! : englishTitle || rawTitle;
  const secondaryTitle = isChineseDefault
    ? englishTitle && englishTitle !== primaryTitle
      ? englishTitle
      : undefined
    : chineseTitle && chineseTitle !== primaryTitle
    ? chineseTitle
    : undefined;

  const castList = (details.cast || []).slice(0, 4);

  const backdropPath = details.backdrop_path || details.poster_path;
  const backdropUrl = backdropPath
    ? `https://image.tmdb.org/t/p/original${backdropPath}`
    : null;

  const activeServer =
    activeServerIndex !== null ? sources[activeServerIndex] || null : null;
  const episodeSourceServer = activeServer || sources[0] || null;
  const seasons = episodeSourceServer?.seasons || [];
  const hasMultipleSeasons = seasons.length > 1;
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

  const releaseYear = (details.release_date || details.first_air_date)?.substring(0, 4);
  const genreNames = details.genres?.slice(0, 3).map((g) => g.name).join(", ");

  const visiblePageItems = serverPages[serverPage]?.items || [];
  const showServerPrev = !resolving && serverPage > 0;
  const showServerNext = !resolving && serverPage < totalServerPages - 1;

  const startPlaybackWithProgress = (
    serverIdx: number,
    seasonIdx: number,
    episodeIdx: number,
    seekTime = 0
  ) => {
    const targetServer = sources[serverIdx];
    if (!targetServer) return;

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

    setActiveServerIndex(serverIdx);
    setActiveSeasonIndex(clampedSeasonIdx);
    setActiveEpisodeIndex(clampedEpIdx);
    setInitialSeekTime(seekTime);
    currentVideoTimeRef.current = seekTime;
    setIsPlaying(true);

    persistWatchHistory(details, {
      sourceId: targetServer.sourceId,
      seasonNumber: seasonGroup?.seasonNumber,
      seasonIndex: clampedSeasonIdx,
      episodeIndex: clampedEpIdx,
      episodeLabel: epLabel,
      currentTime: seekTime,
    });
  };

  const handleResumeClick = () => {
    if (!savedProgress || sources.length === 0) return;

    let targetServerIdx = 0;
    if (savedProgress.sourceId) {
      const foundIdx = sources.findIndex(
        (s) => s.sourceId === savedProgress.sourceId
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
        (s) => s.seasonNumber === savedProgress.seasonNumber
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

    setServerPage(findPageForSourceIndex(serverPages, targetServerIdx));
    setIsEpisodePopoverOpen(false);
    startPlaybackWithProgress(
      targetServerIdx,
      targetSeasonIdx,
      targetEpIdx,
      seekTo
    );
  };

  const handleStreamError = () => {
    if (activeServerIndex !== null && activeServerIndex + 1 < sources.length) {
      const nextIndex = activeServerIndex + 1;
      setServerPage(findPageForSourceIndex(serverPages, nextIndex));
      startPlaybackWithProgress(
        nextIndex,
        activeSeasonIndex,
        activeEpisodeIndex,
        currentVideoTimeRef.current
      );
    }
  };

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    currentVideoTimeRef.current = currentTime;
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 2000) return;
    lastSaveTimeRef.current = now;

    if (!activeServer) return;
    const epLabel = formatEpisodeLabel(
      activeEpisodeObj?.name || "",
      activeEpisodeIndexClamped
    );
    persistWatchHistory(details, {
      sourceId: activeServer.sourceId,
      seasonNumber: activeServerSeasonGroup?.seasonNumber,
      seasonIndex: activeServerSafeSeasonIdx,
      episodeIndex: activeEpisodeIndexClamped,
      episodeLabel: epLabel,
      currentTime,
      duration,
    });
  };

  // Format Resume Pill Label
  const getResumeButtonLabel = (): string | null => {
    if (!savedProgress) return null;
    const timeStr =
      savedProgress.currentTime && savedProgress.currentTime >= 3
        ? formatPlaybackTime(savedProgress.currentTime)
        : null;

    if (type === "tv") {
      const epNum = (savedProgress.episodeIndex ?? 0) + 1;
      const epPart =
        hasMultipleSeasons && savedProgress.seasonNumber
          ? `S${savedProgress.seasonNumber}:E${epNum}`
          : savedProgress.episodeLabel || `Ep ${epNum}`;
      return timeStr ? `Resume ${epPart} · ${timeStr}` : `Resume ${epPart}`;
    }

    return timeStr ? `Resume · ${timeStr}` : "Resume";
  };

  const resumeLabel = getResumeButtonLabel();
  const isAlreadyPlayingSavedSpot =
    isPlaying &&
    savedProgress !== null &&
    activeSeasonIndex === (savedProgress.seasonIndex ?? 0) &&
    activeEpisodeIndex === (savedProgress.episodeIndex ?? 0);
  const showResumePill =
    !resolving &&
    sources.length > 0 &&
    savedProgress !== null &&
    resumeLabel !== null &&
    !isAlreadyPlayingSavedSpot;

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-black relative select-none">
      {/* Top Left Back Button with Apple Liquid Glass Blur */}
      <div className="fixed top-6 left-6 md:top-8 md:left-8 z-[100] pointer-events-auto">
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleBack}
          className="group relative flex items-center gap-2 px-4 h-[46px] rounded-full text-white/90 hover:text-white transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
          aria-label="Go back"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full bg-white/[0.07] group-hover:bg-white/[0.12] backdrop-blur-md border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_32px_rgba(0,0,0,0.75)] transition-colors duration-300"
          />
          <span className="relative z-10 flex items-center gap-2 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110">
            <ArrowLeft size={19} />
            <span className="font-medium text-sm">Back</span>
          </span>
        </button>
      </div>

      {/* Main Stage: Full Video Player when playing, or Balanced Poster + Editorial Info when on Intro */}
      {isPlaying && activeStreamUrl ? (
        <div className="flex-1 min-h-0 w-full relative bg-black overflow-hidden">
          <HlsPlayer
            src={activeStreamUrl}
            initialTime={initialSeekTime}
            onTimeUpdate={handleTimeUpdate}
            onError={handleStreamError}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full flex flex-col justify-between bg-black overflow-hidden relative">
          {/* Upper Poster Artwork */}
          <div className="relative w-full h-[58vh] md:h-[64vh] shrink-0 overflow-hidden bg-black">
            {backdropUrl && (
              <img
                src={backdropUrl}
                alt={primaryTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
            )}
            {/* Soft bottom-only fade into the pure black info stage below */}
            <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-black via-black/75 to-transparent pointer-events-none" />
          </div>

          {/* Spacious Lower Editorial Info Block */}
          <div className="relative z-10 px-6 md:px-8 -mt-20 md:-mt-24 pb-4 md:pb-6 flex flex-col justify-end">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 drop-shadow-2xl max-w-5xl text-balance leading-tight tracking-tight">
              <span onClick={() => copyTextSilently(primaryTitle)}>
                {primaryTitle}
              </span>
              {secondaryTitle && (
                <span className="font-normal text-white/55 text-xl sm:text-2xl md:text-3xl ml-3">
                  {"/ "}
                  <span onClick={() => copyTextSilently(secondaryTitle)}>
                    {secondaryTitle}
                  </span>
                </span>
              )}
            </h1>

            {/* Single-line unified metadata + lead cast row */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm md:text-base font-medium text-white/80 mb-3 tabular-nums">
              {releaseYear && <span>{releaseYear}</span>}
              {details.runtime ? (
                <>
                  <span className="text-white/30">·</span>
                  <span>{details.runtime} min</span>
                </>
              ) : null}
              {details.vote_average > 0 && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-white font-semibold">
                    ★ {details.vote_average.toFixed(1)}
                  </span>
                </>
              )}
              {genreNames && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-white/70">{genreNames}</span>
                </>
              )}
              {castList.length > 0 && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-white/55 font-normal">
                    {castList.join(", ")}
                  </span>
                </>
              )}
            </div>

            {details.overview && (
              <p className="text-white/65 text-xs sm:text-sm md:text-base leading-relaxed max-w-3xl line-clamp-2">
                {details.overview}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Seamless Pure-Black Bottom Controls with Apple Liquid Glass Buttons */}
      <div className="shrink-0 w-full bg-black px-6 md:px-8 pt-3 pb-6 md:pb-8 flex items-center justify-between gap-6 relative z-30">
        {/* Left & Center: Single-Row Paginated Server Pills + Prev/Next Buttons */}
        <div
          ref={serverBarRef}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {resolving ? (
            <div className="flex items-center gap-2 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[42px] w-28 rounded-full bg-white/[0.06] border border-white/10 animate-pulse shrink-0"
                />
              ))}
            </div>
          ) : sources.length === 0 ? (
            <p className="text-xs md:text-sm text-white/50 truncate">
              No playable streams found from enabled sources.
            </p>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-2.5 py-1">
                {visiblePageItems.map(({ src, absoluteIndex }) => {
                  const isSelected = isPlaying && activeServerIndex === absoluteIndex;
                  const isHighPing = src.latencyMs >= HIGH_PING_THRESHOLD_MS;

                  return (
                    <button
                      key={src.sourceId}
                      type="button"
                      onClick={() => {
                        const seekTime = isPlaying
                          ? currentVideoTimeRef.current
                          : 0;
                        startPlaybackWithProgress(
                          absoluteIndex,
                          activeSeasonIndex,
                          activeEpisodeIndex,
                          seekTime
                        );
                      }}
                      tabIndex={0}
                      className={cn(
                        "group flex items-center h-[42px] px-4 rounded-full text-xs md:text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-300 outline-none cursor-pointer border select-none",
                        isSelected
                          ? isHighPing
                            ? "bg-red-500/25 text-red-200 border-red-400/50 shadow-[inset_0_1px_0_0_rgba(255,150,150,0.25),0_8px_24px_rgba(0,0,0,0.65)] font-bold"
                            : "bg-white text-black border-white shadow-[0_8px_24px_rgba(255,255,255,0.18)] font-bold"
                          : isHighPing
                          ? "text-red-400/85 hover:text-red-300 bg-red-500/[0.08] hover:bg-red-500/18 border-red-500/25 hover:border-red-500/40 shadow-[inset_0_1px_0_0_rgba(255,120,120,0.16),0_8px_24px_rgba(0,0,0,0.65)]"
                          : "bg-white/[0.07] text-white/85 border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_24px_rgba(0,0,0,0.65)] hover:bg-white/[0.14] hover:border-white/25 hover:text-white"
                      )}
                      title={
                        isHighPing
                          ? `${src.sourceName}${src.audioLang ? ` · ${src.audioLang}` : ""} (${src.latencyMs}ms - High Ping)`
                          : `${src.sourceName}${src.audioLang ? ` · ${src.audioLang}` : ""} (${src.latencyMs}ms)`
                      }
                    >
                      <span className="flex items-center gap-2 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105">
                        <span>
                          {src.sourceName}
                          {src.audioLang ? ` · ${src.audioLang}` : ""}
                        </span>
                        <span
                          className={cn(
                            "text-[11px] font-mono tabular-nums",
                            isSelected
                              ? isHighPing
                                ? "text-red-200/80"
                                : "text-black/65"
                              : isHighPing
                              ? "text-red-400/75 group-hover:text-red-300"
                              : "text-white/45 group-hover:text-white/70"
                          )}
                        >
                          {src.latencyMs}ms
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {totalServerPages > 1 && (
                <div className="flex items-center gap-1.5 ml-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setServerPage((p) => Math.max(0, p - 1))}
                    disabled={!showServerPrev}
                    className={cn(
                      "group flex items-center justify-center w-[42px] h-[42px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_24px_rgba(0,0,0,0.65)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none select-none",
                      showServerPrev
                        ? "hover:bg-white/15 cursor-pointer text-white"
                        : "text-white/25 cursor-not-allowed pointer-events-none"
                    )}
                    aria-label="Previous servers"
                  >
                    <ChevronLeft
                      className={cn(
                        "w-5 h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                        showServerPrev
                          ? "group-hover:scale-125 text-white"
                          : "text-white/25"
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setServerPage((p) => Math.min(totalServerPages - 1, p + 1))
                    }
                    disabled={!showServerNext}
                    className={cn(
                      "group flex items-center justify-center w-[42px] h-[42px] rounded-full bg-white/[0.07] border border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_8px_24px_rgba(0,0,0,0.65)] transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none select-none",
                      showServerNext
                        ? "hover:bg-white/15 cursor-pointer text-white"
                        : "text-white/25 cursor-not-allowed pointer-events-none"
                    )}
                    aria-label="Next servers"
                  >
                    <ChevronRight
                      className={cn(
                        "w-5 h-5 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                        showServerNext
                          ? "group-hover:scale-125 text-white"
                          : "text-white/25"
                      )}
                    />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Resume Pill (when watchProgress exists) + White Episode Popover Trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          {showResumePill && resumeLabel && (
            <button
              type="button"
              onClick={handleResumeClick}
              className="group flex items-center h-[42px] px-4 rounded-full text-xs md:text-sm font-medium whitespace-nowrap shrink-0 bg-white/[0.09] text-white border border-white/[0.18] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_8px_24px_rgba(0,0,0,0.65)] hover:bg-white/[0.16] hover:border-white/30 transition-colors duration-300 cursor-pointer focus:outline-none select-none tabular-nums"
            >
              <span className="flex items-center gap-2 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105">
                <Play size={14} className="fill-white text-white shrink-0" />
                <span>{resumeLabel}</span>
              </span>
            </button>
          )}

          {!resolving && episodeSourceServer && episodes.length > 0 && (
            <div ref={popoverRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsEpisodePopoverOpen((prev) => !prev)}
                className="group flex items-center h-[42px] px-4 rounded-full text-xs md:text-sm font-bold whitespace-nowrap shrink-0 bg-white text-black border border-white shadow-[0_8px_32px_rgba(255,255,255,0.14)] hover:bg-white/90 transition-colors duration-300 cursor-pointer focus:outline-none select-none"
              >
                <span className="flex items-center gap-2 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105">
                  <Layers size={15} />
                  <span>
                    {hasMultipleSeasons && currentSeasonGroup
                      ? `S${currentSeasonGroup.seasonNumber} · Episodes`
                      : "Episodes"}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-black/65">
                    {safeEpisodeIndex + 1}/{episodes.length}
                  </span>
                  <ChevronUp
                    size={15}
                    className={cn(
                      "transition-transform duration-300",
                      isEpisodePopoverOpen && "rotate-180"
                    )}
                  />
                </span>
              </button>

              {isEpisodePopoverOpen && (
                <div className="absolute bottom-full right-0 mb-3 w-[310px] sm:w-[390px] md:w-[460px] max-h-[60vh] rounded-3xl bg-black/80 backdrop-blur-xl border border-white/[0.16] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_16px_48px_rgba(0,0,0,0.92)] p-4 z-50 flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-white truncate">
                        {hasMultipleSeasons
                          ? "Select Season & Episode"
                          : "Select Episode"}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-white/50 shrink-0">
                        · {episodes.length} eps
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEpisodePopoverOpen(false)}
                      className="group flex items-center justify-center w-7 h-7 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="Close episodes"
                    >
                      <X
                        size={15}
                        className="transition-transform duration-500 group-hover:scale-110"
                      />
                    </button>
                  </div>

                  {/* Multi-Season Selector Bar */}
                  {hasMultipleSeasons && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-3 border-b border-white/10 shrink-0">
                      {seasons.map((season, sIdx) => {
                        const isSeasonActive = safeSeasonIndex === sIdx;
                        return (
                          <button
                            key={`season-${season.seasonNumber}-${sIdx}`}
                            type="button"
                            onClick={() => {
                              setActiveSeasonIndex(sIdx);
                              setActiveEpisodeIndex(0);
                            }}
                            className={cn(
                              "group px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-200 cursor-pointer border focus:outline-none select-none",
                              isSeasonActive
                                ? "bg-white text-black border-white font-bold"
                                : "bg-white/[0.06] text-white/75 border-white/10 hover:bg-white/[0.14] hover:text-white"
                            )}
                          >
                            <span className="inline-block transition-transform duration-500 group-hover:scale-105">
                              {season.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto no-scrollbar pr-0.5">
                    {episodes.map((ep, idx) => {
                      const isCurrentEp = isPlaying && safeEpisodeIndex === idx;
                      const label = formatEpisodeLabel(ep.name, idx);
                      return (
                        <button
                          key={`${ep.name}-${idx}`}
                          type="button"
                          onClick={() => {
                            const targetServerIdx =
                              activeServerIndex !== null ? activeServerIndex : 0;
                            setIsEpisodePopoverOpen(false);
                            startPlaybackWithProgress(
                              targetServerIdx,
                              safeSeasonIndex,
                              idx,
                              0
                            );
                          }}
                          className={cn(
                            "group px-3 py-2 rounded-xl text-xs font-medium tabular-nums truncate transition-colors duration-200 cursor-pointer border focus:outline-none select-none",
                            isCurrentEp
                              ? "bg-white text-black border-white font-bold"
                              : "bg-white/[0.06] text-white/80 border-white/10 hover:bg-white/[0.14] hover:border-white/25 hover:text-white"
                          )}
                          title={label}
                        >
                          <span className="inline-block truncate max-w-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
