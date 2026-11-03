import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { MediaDetails, MediaItem, ResolvedStreamSource } from "../types";
import { HlsPlayer } from "../components/HlsPlayer";
import { getDisabledSiteIds } from "../components/TvboxModal";
import {
  Play,
  ArrowLeft,
  SlidersHorizontal,
  Search,
  RefreshCw,
  Tv,
  Film,
  Sparkles,
} from "lucide-react";
import { cn } from "../utils";

export function Player() {
  const { type, id } = useParams<{ type: "movie" | "tv"; id: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [sources, setSources] = useState<ResolvedStreamSource[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState<string>("");
  const [resolving, setResolving] = useState(true);

  const [activeServerIndex, setActiveServerIndex] = useState(0);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [customKeyword, setCustomKeyword] = useState("");
  const playButtonRef = useRef<HTMLButtonElement>(null);

  const fetchVodStreams = useCallback(
    async (overrideKeyword?: string) => {
      if (!type || !id) return;
      setResolving(true);
      try {
        const disabled = getDisabledSiteIds();
        const res = await api.resolveVodStreams(
          type,
          id,
          overrideKeyword,
          disabled
        );
        const list = res.sources || [];
        setSources(list);
        setResolvedQuery(res.searchQuery || "");
        setActiveServerIndex(0);
        setActiveEpisodeIndex(0);
      } catch {
        setSources([]);
      } finally {
        setResolving(false);
      }
    },
    [type, id]
  );

  useEffect(() => {
    if (type && id) {
      setDetails(null);
      setIsPlaying(false);
      setActiveServerIndex(0);
      setActiveEpisodeIndex(0);
      setCustomKeyword("");

      api.getDetails(type, id).then((data) => {
        setDetails(data);
        try {
          const stored = localStorage.getItem("watch_history");
          let history: MediaItem[] = stored ? JSON.parse(stored) : [];
          history = history.filter((item) => item.id.toString() !== id);
          history.unshift({ ...(data as MediaItem), media_type: type });
          localStorage.setItem(
            "watch_history",
            JSON.stringify(history.slice(0, 20))
          );
        } catch {}
      });

      fetchVodStreams();
    }
  }, [type, id, fetchVodStreams]);

  // Re-resolve if user toggles sources or imports a new TVBox config in the modal
  useEffect(() => {
    const handleSourcesUpdated = () => {
      fetchVodStreams(customKeyword || undefined);
    };
    window.addEventListener("tvbox-sources-updated", handleSourcesUpdated);
    return () =>
      window.removeEventListener("tvbox-sources-updated", handleSourcesUpdated);
  }, [fetchVodStreams, customKeyword]);

  useEffect(() => {
    if (details && !isPlaying) {
      playButtonRef.current?.focus();
    }
  }, [details, isPlaying]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVodStreams(customKeyword.trim() || undefined);
  };

  if (!details) {
    return (
      <div className="p-12 flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const title = details.title || details.name;
  const backdropPath = details.backdrop_path || details.poster_path;
  const backdropUrl = backdropPath
    ? `https://image.tmdb.org/t/p/original${backdropPath}`
    : null;

  const activeServer = sources[activeServerIndex] || sources[0] || null;
  const episodes = activeServer?.episodes || [];
  const safeEpisodeIndex =
    activeEpisodeIndex < episodes.length ? activeEpisodeIndex : 0;
  const activeEpisode = episodes[safeEpisodeIndex] || null;
  const activeStreamUrl = activeEpisode?.url || "";

  const handleStreamError = () => {
    // Automatically try the next server if the current stream fails
    if (activeServerIndex + 1 < sources.length) {
      setActiveServerIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-28 relative">
      {/* Top Bar: Left Back Button & Right TVBox Config Button */}
      <div className="absolute top-6 left-6 right-6 md:top-8 md:left-8 md:right-8 z-30 flex items-center justify-between pointer-events-none">
        <button
          type="button"
          onClick={handleBack}
          className="group flex items-center gap-2 px-4 h-[46px] rounded-full bg-[#121212] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] text-white/90 hover:text-white transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none pointer-events-auto"
          aria-label="Go back"
        >
          <span className="flex items-center gap-2 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 will-change-transform transform-gpu backface-hidden">
            <ArrowLeft size={19} />
            <span className="font-medium text-sm">Back</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("open-tvbox-modal"))
          }
          className="group flex items-center gap-2 px-4 h-[46px] rounded-full bg-[#121212] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] text-white/90 hover:text-white transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none pointer-events-auto"
          aria-label="TVBox Sources Settings"
        >
          <span className="flex items-center gap-2 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 will-change-transform transform-gpu backface-hidden">
            <SlidersHorizontal size={17} />
            <span className="font-medium text-sm">TVBox 配置源</span>
            {sources.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-white text-black font-bold tabular-nums">
                {sources.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Hero / Player Section */}
      <div className="w-full relative aspect-video bg-black overflow-hidden group">
        {isPlaying && activeStreamUrl ? (
          <HlsPlayer src={activeStreamUrl} onError={handleStreamError} />
        ) : (
          <div className="absolute inset-0 w-full h-full">
            {backdropUrl && (
              <img
                src={backdropUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-50"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />

            {/* Play Overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-10 pt-32">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-5 drop-shadow-2xl">
                {title}
              </h1>
              <div className="flex flex-wrap gap-3 items-center text-gray-200 mb-6 font-medium text-sm md:text-base">
                {(details.release_date || details.first_air_date) && (
                  <span className="bg-white/15 px-3 py-1 rounded-full border border-white/10 tabular-nums">
                    {(details.release_date || details.first_air_date)?.substring(
                      0,
                      4
                    )}
                  </span>
                )}
                {details.runtime && (
                  <span className="bg-white/15 px-3 py-1 rounded-full border border-white/10 tabular-nums">
                    {details.runtime} min
                  </span>
                )}
                {details.vote_average > 0 && (
                  <span className="text-black font-bold bg-white px-3 py-1 rounded-full shadow-lg tabular-nums">
                    ★ {details.vote_average.toFixed(1)}
                  </span>
                )}
                {activeServer && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs md:text-sm font-medium">
                    当前线路: {activeServer.sourceName}
                    {activeEpisode ? ` · ${activeEpisode.name}` : ""}
                  </span>
                )}
                {details.genres?.slice(0, 3).map((g) => (
                  <span key={g.id} className="text-gray-300">
                    {g.name}
                  </span>
                ))}
              </div>
              <p className="text-gray-300 text-base md:text-xl leading-relaxed max-w-3xl mb-8 line-clamp-3 drop-shadow-md">
                {details.overview}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  ref={playButtonRef}
                  type="button"
                  disabled={resolving || !activeStreamUrl}
                  onClick={() => {
                    if (activeStreamUrl) setIsPlaying(true);
                  }}
                  tabIndex={0}
                  className="flex items-center gap-3 bg-white text-black px-9 py-4 rounded-full font-bold text-lg md:text-xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none focus:ring-4 focus:ring-white/50 focus:scale-105 hover:scale-105 hover:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none shadow-2xl cursor-pointer"
                >
                  <Play size={26} className="fill-black" />
                  <span>
                    {resolving
                      ? "正在检索影视仓播放源..."
                      : activeStreamUrl
                      ? `立即播放${activeEpisode ? ` (${activeEpisode.name})` : ""}`
                      : "暂无可用播放源"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Streaming Sources & Episode Selector Section */}
      <div className="px-6 md:px-16 mt-10 max-w-7xl mx-auto w-full space-y-10">
        {/* Header + Manual Keyword Search Override */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-white/95 tracking-wide">
              Streaming Servers
            </h2>
            {resolvedQuery && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#121212] border border-white/10 text-white/70">
                <Sparkles size={13} className="text-white/60" />
                匹配词: <strong className="text-white">{resolvedQuery}</strong>
              </span>
            )}
          </div>

          <form
            onSubmit={handleCustomSearchSubmit}
            className="flex items-center gap-2"
          >
            <div className="relative flex items-center h-[42px] w-full sm:w-64 rounded-full bg-[#121212] border border-white/10 focus-within:border-white/30 px-3.5">
              <Search size={15} className="text-white/40 shrink-0 mr-2" />
              <input
                type="text"
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                placeholder="手动输入片名检索源..."
                className="w-full bg-transparent text-xs text-white placeholder:text-white/35 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={resolving}
              className="flex items-center gap-1.5 h-[42px] px-4 rounded-full bg-[#121212] border border-white/10 hover:border-white/30 text-xs font-medium text-white/85 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw size={14} className={cn(resolving && "animate-spin")} />
              <span>检索</span>
            </button>
          </form>
        </div>

        {/* Server Buttons */}
        {resolving ? (
          <div className="flex flex-wrap items-center gap-3.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[58px] w-44 rounded-2xl bg-[#121212] border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#121212] border border-white/10 text-center space-y-3">
            <p className="text-base font-medium text-white/80">
              未能在当前启用的采集源中检索到《{resolvedQuery || title}》的直连流
            </p>
            <p className="text-xs text-white/45 max-w-lg mx-auto">
              您可以在上方输入框尝试输入该影视剧的中文译名（或简称）重新检索，或点击右上角「TVBox 配置源」启用更多采集线路。
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3.5">
            {sources.map((src, index) => {
              const isSelected = activeServerIndex === index;
              return (
                <button
                  key={src.sourceId}
                  type="button"
                  onClick={() => {
                    setActiveServerIndex(index);
                    // Preserve episode index if the new server also has that episode
                    if (activeEpisodeIndex >= src.episodes.length) {
                      setActiveEpisodeIndex(0);
                    }
                    setIsPlaying(true);
                  }}
                  tabIndex={0}
                  className={cn(
                    "group flex flex-col items-start justify-center px-5 py-3 rounded-2xl font-medium transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none cursor-pointer border text-left min-w-[160px]",
                    isSelected
                      ? "bg-white text-black border-white"
                      : "bg-[#121212] text-white border-white/10 hover:border-white/30 hover:scale-[1.03]"
                  )}
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <span className="font-bold text-sm tracking-wide">
                      {src.sourceName}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full",
                        isSelected
                          ? "bg-black/10 text-black/80"
                          : "bg-white/10 text-white/65"
                      )}
                    >
                      {src.episodes.length} 集
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2 text-[11px] mt-1 truncate max-w-[200px]",
                      isSelected ? "text-black/70" : "text-white/45"
                    )}
                  >
                    <span className="truncate">
                      {src.vodRemarks || src.vodName}
                    </span>
                    <span className="font-mono tabular-nums shrink-0">
                      · {src.latencyMs}ms
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Episode Selector Grid */}
        {!resolving && activeServer && episodes.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {type === "tv" ? (
                  <Tv size={18} className="text-white/70" />
                ) : (
                  <Film size={18} className="text-white/70" />
                )}
                <h3 className="text-lg font-bold text-white/90">
                  选集播放 ({activeServer.vodName})
                </h3>
                {activeServer.vodYear && (
                  <span className="text-xs font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-[#121212] border border-white/10 text-white/60">
                    {activeServer.vodYear}
                  </span>
                )}
              </div>
              <span className="text-xs text-white/45 font-mono tabular-nums">
                共 {episodes.length} 个播放节点 · 来源: {activeServer.fromConfig}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
              {episodes.map((ep, idx) => {
                const isCurrentEp = safeEpisodeIndex === idx;
                return (
                  <button
                    key={`${ep.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      setActiveEpisodeIndex(idx);
                      setIsPlaying(true);
                    }}
                    className={cn(
                      "px-3.5 py-2.5 rounded-xl text-xs font-medium tabular-nums truncate transition-all duration-200 cursor-pointer border focus:outline-none select-none",
                      isCurrentEp
                        ? "bg-white text-black border-white font-bold"
                        : "bg-[#121212] text-white/80 border-white/10 hover:border-white/30 hover:text-white"
                    )}
                    title={ep.name}
                  >
                    {ep.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
