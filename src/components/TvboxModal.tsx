import React, { useEffect, useState } from "react";
import { api } from "../api";
import { TvboxConfigItem, VodSite } from "../types";
import {
  X,
  Copy,
  Check,
  RefreshCw,
  Server,
  Link2,
  Plus,
  Activity,
  FolderGit2,
} from "lucide-react";
import { cn } from "../utils";

export const DISABLED_SITES_STORAGE_KEY = "tvbox_disabled_sites";

export function getDisabledSiteIds(): string[] {
  try {
    const raw = localStorage.getItem(DISABLED_SITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setDisabledSiteIds(ids: string[]) {
  try {
    localStorage.setItem(DISABLED_SITES_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent("tvbox-sources-updated"));
  } catch {}
}

interface TvboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TvboxModal({ isOpen, onClose }: TvboxModalProps) {
  const [activeTab, setActiveTab] = useState<"sources" | "configs">("sources");
  const [configs, setConfigs] = useState<TvboxConfigItem[]>([]);
  const [sites, setSites] = useState<VodSite[]>([]);
  const [disabledIds, setDisabledIdsState] = useState<string[]>(() =>
    getDisabledSiteIds()
  );
  const [loading, setLoading] = useState(false);

  // Ping latency map: siteId -> { ok, latencyMs, testing }
  const [pingMap, setPingMap] = useState<
    Record<string, { ok?: boolean; latencyMs?: number; testing?: boolean }>
  >({});

  // Config parse feedback & multi-repo expansion
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [parseFeedback, setParseFeedback] = useState<{
    id: string;
    ok: boolean;
    message: string;
    subRepos?: { name: string; url: string }[];
  } | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom TVBox URL input
  const [customUrl, setCustomUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [customParsing, setCustomParsing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setDisabledIdsState(getDisabledSiteIds());
    api
      .getTvboxConfigs()
      .then((data) => {
        setConfigs(data.configs || []);
        setSites(data.sites || []);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSite = (siteId: string) => {
    const next = disabledIds.includes(siteId)
      ? disabledIds.filter((id) => id !== siteId)
      : [...disabledIds, siteId];
    setDisabledIdsState(next);
    setDisabledSiteIds(next);
  };

  const enableAllSites = () => {
    setDisabledIdsState([]);
    setDisabledSiteIds([]);
  };

  const handlePingAll = async () => {
    const initial: Record<string, { testing: boolean }> = {};
    for (const s of sites) {
      initial[s.id] = { testing: true };
    }
    setPingMap(initial);

    await Promise.allSettled(
      sites.map(async (s) => {
        const res = await api.pingVodSite(s.id);
        setPingMap((prev) => ({
          ...prev,
          [s.id]: {
            ok: res.ok,
            latencyMs: res.latencyMs,
            testing: false,
          },
        }));
      })
    );
  };

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  const handleSyncConfig = async (id: string, url: string, name: string) => {
    setParsingId(id);
    setParseFeedback(null);
    try {
      const data = await api.parseTvboxConfig(url, name);
      if (data.sites) {
        setSites(data.sites);
      }
      setParseFeedback({
        id,
        ok: data.result.ok,
        message: data.result.message || "Parsed successfully",
        subRepos: data.result.subRepos,
      });
      window.dispatchEvent(new CustomEvent("tvbox-sources-updated"));
    } catch {
      setParseFeedback({
        id,
        ok: false,
        message: "Failed to parse configuration. Please try again.",
      });
    } finally {
      setParsingId(null);
    }
  };

  const handleAddCustomConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    setCustomParsing(true);
    setParseFeedback(null);
    try {
      const label = customName.trim() || "Custom TVBox";
      const data = await api.parseTvboxConfig(customUrl.trim(), label);
      if (data.sites) {
        setSites(data.sites);
      }
      setParseFeedback({
        id: "custom",
        ok: data.result.ok,
        message: data.result.message || "Parsed successfully",
        subRepos: data.result.subRepos,
      });
      if (data.result.ok) {
        setCustomUrl("");
        setCustomName("");
      }
      window.dispatchEvent(new CustomEvent("tvbox-sources-updated"));
    } finally {
      setCustomParsing(false);
    }
  };

  const enabledCount = sites.filter((s) => !disabledIds.includes(s.id)).length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-3xl bg-[#121212] border border-white/10 shadow-[0_16px_64px_rgba(0,0,0,0.95)] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/10">
              <Server size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-wide text-white leading-tight">
                TVBox Source Center
              </h3>
              <p className="text-xs text-white/50 mt-0.5 tabular-nums">
                Preloaded awesome-zhuiju-free repositories · {enabledCount}/{sites.length} direct sources enabled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Segmented Tab Switcher */}
            <div className="relative flex items-center gap-1 p-1 h-[40px] rounded-full bg-black border border-white/10">
              <div
                className="absolute top-1 bottom-1 bg-white rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                style={{
                  width: "144px",
                  left: activeTab === "sources" ? "4px" : "calc(4px + 144px + 4px)",
                }}
              />
              <button
                type="button"
                onClick={() => setActiveTab("sources")}
                className={cn(
                  "relative z-10 w-[144px] h-[32px] text-xs font-medium rounded-full transition-colors duration-300 cursor-pointer focus:outline-none select-none tabular-nums",
                  activeTab === "sources" ? "text-black" : "text-white/70 hover:text-white"
                )}
              >
                Stream Sources ({sites.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("configs")}
                className={cn(
                  "relative z-10 w-[144px] h-[32px] text-xs font-medium rounded-full transition-colors duration-300 cursor-pointer focus:outline-none select-none tabular-nums",
                  activeTab === "configs" ? "text-black" : "text-white/70 hover:text-white"
                )}
              >
                Config URLs ({configs.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="group flex items-center justify-center w-10 h-10 rounded-full bg-black border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer focus:outline-none select-none"
            >
              <X
                size={18}
                className="opacity-70 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110"
              />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl bg-white/5 border border-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : activeTab === "sources" ? (
            <>
              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
                <p className="text-xs text-white/60">
                  Opening any movie or TV show automatically queries enabled providers in parallel for direct M3U8 streams.
                </p>
                <div className="flex items-center gap-2">
                  {disabledIds.length > 0 && (
                    <button
                      type="button"
                      onClick={enableAllSites}
                      className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-black border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Enable All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePingAll}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-white text-black hover:bg-white/90 transition-colors cursor-pointer"
                  >
                    <Activity size={14} />
                    <span>Speed Test</span>
                  </button>
                </div>
              </div>

              {/* Active VOD Providers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sites.map((site) => {
                  const isEnabled = !disabledIds.includes(site.id);
                  const ping = pingMap[site.id];

                  return (
                    <div
                      key={site.id}
                      onClick={() => toggleSite(site.id)}
                      className={cn(
                        "group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none",
                        isEnabled
                          ? "bg-black/60 border-white/15 hover:border-white/30"
                          : "bg-black/20 border-white/5 opacity-50 hover:opacity-75"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0",
                            !isEnabled
                              ? "bg-white/20"
                              : ping?.testing
                              ? "bg-amber-400 animate-ping"
                              : ping?.ok === false
                              ? "bg-red-500"
                              : "bg-emerald-400"
                          )}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">
                              {site.name}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 shrink-0">
                              {site.fromConfig}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/35 font-mono truncate mt-0.5">
                            {site.api}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        {ping && !ping.testing && (
                          <span
                            className={cn(
                              "text-xs font-mono tabular-nums",
                              ping.ok ? "text-emerald-400" : "text-red-400"
                            )}
                          >
                            {ping.ok ? `${ping.latencyMs}ms` : "Timeout"}
                          </span>
                        )}
                        <div
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                            isEnabled
                              ? "bg-white text-black border-white"
                              : "bg-transparent text-white/40 border-white/15"
                          )}
                        >
                          {isEnabled ? "Enabled" : "Disabled"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Custom TVBox Config Input */}
              <form
                onSubmit={handleAddCustomConfig}
                className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white opacity-80 flex items-center gap-1.5">
                    <Plus size={14} />
                    Add Custom TVBox Config URL (Single or Multi-Repo JSON)
                  </span>
                  <a
                    href="https://github.com/laoma528/awesome-zhuiju-free"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-white opacity-50 hover:opacity-100 flex items-center gap-1 transition-opacity"
                  >
                    <FolderGit2 size={13} />
                    <span>awesome-zhuiju-free</span>
                  </a>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Name (optional)"
                    className="sm:w-40 h-10 px-3.5 rounded-full bg-[#121212] border border-white/10 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-white/30"
                  />
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="Paste TVBox config URL, e.g. https://raw.liucn.cc/box/m.json"
                    className="flex-1 h-10 px-4 rounded-full bg-[#121212] border border-white/10 text-xs text-white font-mono placeholder:text-white/35 focus:outline-none focus:border-white/30"
                  />
                  <button
                    type="submit"
                    disabled={customParsing || !customUrl.trim()}
                    className="h-10 px-5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                  >
                    {customParsing ? "Parsing..." : "Parse & Import"}
                  </button>
                </div>
                {parseFeedback?.id === "custom" && (
                  <p
                    className={cn(
                      "text-xs",
                      parseFeedback.ok ? "text-emerald-400" : "text-amber-400"
                    )}
                  >
                    {parseFeedback.message}
                  </p>
                )}
              </form>

              {/* Preloaded awesome-zhuiju-free Configs List */}
              <div className="space-y-3">
                {configs.map((cfg) => {
                  const isParsing = parsingId === cfg.id;
                  const feedback =
                    parseFeedback?.id === cfg.id ? parseFeedback : null;

                  return (
                    <div
                      key={cfg.id}
                      className="p-4 rounded-2xl bg-black/60 border border-white/10 hover:border-white/20 transition-colors space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold text-white">
                            {cfg.name}
                          </span>
                          <span
                            className={cn(
                              "text-[11px] px-2.5 py-0.5 rounded-full font-medium border",
                              cfg.type === "multi"
                                ? "bg-white/10 text-white border-white/20"
                                : "bg-white/5 text-white/70 border-white/10"
                            )}
                          >
                            {cfg.type === "multi" ? "Multi-Repo" : "Single Repo"}
                          </span>
                          {cfg.cmsSiteCount && (
                            <span className="text-[11px] text-emerald-400 font-mono tabular-nums">
                              {cfg.cmsSiteCount} direct sources
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(cfg.id, cfg.url)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#121212] border border-white/10 text-white opacity-80 hover:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
                          >
                            {copiedId === cfg.id ? (
                              <>
                                <Check size={13} className="text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Copy URL</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isParsing}
                            onClick={() =>
                              handleSyncConfig(cfg.id, cfg.url, cfg.name)
                            }
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            <RefreshCw
                              size={13}
                              className={cn(isParsing && "animate-spin")}
                            />
                            <span>{isParsing ? "Syncing..." : "Sync Sources"}</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-white/55">{cfg.description}</p>

                      <div className="flex items-center gap-2 text-xs font-mono text-white opacity-40 bg-[#121212] px-3 py-1.5 rounded-xl border border-white/5 truncate">
                        <Link2 size={13} className="shrink-0 text-white" />
                        <span className="truncate">{cfg.url}</span>
                      </div>

                      {feedback && (
                        <div className="pt-1 space-y-2">
                          <p
                            className={cn(
                              "text-xs",
                              feedback.ok ? "text-emerald-400" : "text-amber-300"
                            )}
                          >
                            {feedback.message}
                          </p>
                          {feedback.subRepos && feedback.subRepos.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {feedback.subRepos.slice(0, 10).map((sub, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    handleSyncConfig(
                                      cfg.id,
                                      sub.url,
                                      `${cfg.name}-${sub.name}`
                                    )
                                  }
                                  className="px-3 py-1 rounded-full text-xs bg-[#121212] border border-white/15 text-white/80 hover:text-white hover:border-white/40 transition-colors cursor-pointer"
                                >
                                  Import Sub-Repo: {sub.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
