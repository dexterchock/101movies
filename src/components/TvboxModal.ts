import { api } from "../api";
import { icons } from "../icons";
import type { TvboxConfigItem, VodSite } from "../types";
import { cn, escapeHtml } from "../utils";

export const DISABLED_SITES_STORAGE_KEY = "tvbox_disabled_sites";

export function getDisabledSiteIds(): string[] {
  try {
    const raw = localStorage.getItem(DISABLED_SITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setDisabledSiteIds(ids: string[]): void {
  try {
    localStorage.setItem(DISABLED_SITES_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent("tvbox-sources-updated"));
  } catch {}
}

export interface TvboxModalController {
  destroy: () => void;
}

export function openTvboxModal(onClose: () => void): TvboxModalController {
  const ac = new AbortController();
  const { signal } = ac;

  let activeTab: "sources" | "configs" = "sources";
  let configs: TvboxConfigItem[] = [];
  let sites: VodSite[] = [];
  let disabledIds = getDisabledSiteIds();
  let loading = true;
  let parsingId: string | null = null;
  let copiedId: string | null = null;
  let customName = "";
  let customUrl = "";
  let customParsing = false;
  let parseFeedback: {
    id: string;
    ok: boolean;
    message: string;
    subRepos?: { name: string; url: string }[];
  } | null = null;
  const pingMap: Record<string, { ok?: boolean; latencyMs?: number; testing?: boolean }> = {};

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const panel = document.createElement("div");
  panel.className = "modal-panel";
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  const destroy = () => {
    ac.abort();
    backdrop.remove();
  };

  const handleClose = () => {
    destroy();
    onClose();
  };

  backdrop.addEventListener("click", handleClose, { signal });
  panel.addEventListener("click", (e) => e.stopPropagation(), { signal });
  window.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    },
    { signal }
  );

  const toggleSite = (siteId: string) => {
    disabledIds = disabledIds.includes(siteId)
      ? disabledIds.filter((id) => id !== siteId)
      : [...disabledIds, siteId];
    setDisabledSiteIds(disabledIds);
    render();
  };

  const handlePingAll = async () => {
    for (const s of sites) {
      pingMap[s.id] = { testing: true };
    }
    render();
    await Promise.allSettled(
      sites.map(async (s) => {
        try {
          const res = await api.pingVodSite(s.id, signal);
          pingMap[s.id] = { ok: res.ok, latencyMs: res.latencyMs, testing: false };
        } catch {
          pingMap[s.id] = { ok: false, testing: false };
        }
        if (!signal.aborted) render();
      })
    );
  };

  const handleSyncConfig = async (id: string, url: string, name: string) => {
    parsingId = id;
    parseFeedback = null;
    render();
    try {
      const data = await api.parseTvboxConfig(url, name, signal);
      if (data.sites) sites = data.sites;
      parseFeedback = {
        id,
        ok: data.result.ok,
        message: data.result.message || "Parsed successfully",
        subRepos: data.result.subRepos,
      };
      window.dispatchEvent(new CustomEvent("tvbox-sources-updated"));
    } catch {
      if (!signal.aborted) {
        parseFeedback = {
          id,
          ok: false,
          message: "Failed to parse configuration. Please try again.",
        };
      }
    } finally {
      parsingId = null;
      if (!signal.aborted) render();
    }
  };

  const render = () => {
    if (signal.aborted) return;
    const enabledCount = sites.filter((s) => !disabledIds.includes(s.id)).length;

    panel.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.1);">
            ${icons.server(18)}
          </div>
          <div>
            <h3 style="margin:0;font-size:18px;font-weight:700;color:#fff;">TVBox Source Center</h3>
            <p class="tabular-nums" style="margin:2px 0 0 0;font-size:12px;color:rgba(255,255,255,0.5);">
              Preloaded awesome-zhuiju-free repositories · ${enabledCount}/${sites.length} direct sources enabled
            </p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="capsule-group" style="height:40px;padding:4px;">
            <div class="capsule-indicator" style="width:144px;top:4px;bottom:4px;left:4px;transform:translate3d(${activeTab === "sources" ? 0 : 148}px,0,0);"></div>
            <button type="button" data-tab="sources" class="capsule-btn tabular-nums ${activeTab === "sources" ? "is-active" : ""}" style="width:144px;height:32px;font-size:12px;">Stream Sources (${sites.length})</button>
            <button type="button" data-tab="configs" class="capsule-btn tabular-nums ${activeTab === "configs" ? "is-active" : ""}" style="width:144px;height:32px;font-size:12px;">Config URLs (${configs.length})</button>
          </div>
          <button type="button" data-close-modal aria-label="Close settings" class="pill-arrow-btn" style="width:40px;height:40px;background:rgba(23,23,23,0.7);border:1px solid rgba(255,255,255,0.14);">
            ${icons.x("", 18)}
          </button>
        </div>
      </div>
      <div class="no-scrollbar" style="flex:1 1 0%;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:20px;">
        ${
          loading
            ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">
                ${Array.from({ length: 8 })
                  .map(
                    () =>
                      `<div class="animate-pulse" style="height:64px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.05);"></div>`
                  )
                  .join("")}
               </div>`
            : activeTab === "sources"
            ? `
              <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
                <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.6);">
                  Opening any movie or TV show automatically queries enabled providers in parallel for direct M3U8 streams.
                </p>
                <div style="display:flex;align-items:center;gap:8px;">
                  ${
                    disabledIds.length > 0
                      ? `<button type="button" data-enable-all style="padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:500;background:rgba(23,23,23,0.7);border:1px solid rgba(255,255,255,0.14);color:#fff;cursor:pointer;">Enable All</button>`
                      : ""
                  }
                  <button type="button" data-ping-all style="display:flex;align-items:center;gap:6px;padding:6px 16px;border-radius:9999px;font-size:12px;font-weight:500;background:#fff;color:#000;cursor:pointer;">
                    ${icons.activity(14)}<span>Speed Test</span>
                  </button>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
                ${sites
                  .map((site) => {
                    const isEnabled = !disabledIds.includes(site.id);
                    const ping = pingMap[site.id];
                    const dotColor = !isEnabled
                      ? "rgba(255,255,255,0.2)"
                      : ping?.testing
                      ? "#fbbf24"
                      : ping?.ok === false
                      ? "#ef4444"
                      : "#34d399";
                    return `
                      <div data-toggle-site="${escapeHtml(site.id)}" style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-radius:16px;border:1px solid ${isEnabled ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"};background:${isEnabled ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.2)"};opacity:${isEnabled ? 1 : 0.5};cursor:pointer;">
                        <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                          <div style="width:10px;height:10px;border-radius:9999px;background:${dotColor};flex-shrink:0;"></div>
                          <div style="min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;">
                              <span style="font-size:14px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(site.name)}</span>
                              <span style="font-size:11px;padding:2px 8px;border-radius:9999px;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);flex-shrink:0;">${escapeHtml(site.fromConfig)}</span>
                            </div>
                            <p style="margin:2px 0 0 0;font-size:11px;color:rgba(255,255,255,0.35);font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(site.api)}</p>
                          </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;margin-left:12px;">
                          ${
                            ping && !ping.testing
                              ? `<span class="tabular-nums" style="font-size:12px;font-family:monospace;color:${ping.ok ? "#34d399" : "#f87171"};">${ping.ok ? `${ping.latencyMs}ms` : "Timeout"}</span>`
                              : ""
                          }
                          <div style="padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:500;border:1px solid ${isEnabled ? "#fff" : "rgba(255,255,255,0.15)"};background:${isEnabled ? "#fff" : "transparent"};color:${isEnabled ? "#000" : "rgba(255,255,255,0.4)"};">
                            ${isEnabled ? "Enabled" : "Disabled"}
                          </div>
                        </div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            `
            : `
              <form data-custom-form style="padding:16px;border-radius:16px;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;gap:12px;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <span style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.8);display:flex;align-items:center;gap:6px;">
                    ${icons.plus(14)}<span>Add Custom TVBox Config URL (Single or Multi-Repo JSON)</span>
                  </span>
                  <a href="https://github.com/laoma528/awesome-zhuiju-free" target="_blank" rel="noreferrer" style="font-size:12px;color:rgba(255,255,255,0.5);display:flex;align-items:center;gap:4px;">
                    ${icons.folderGit2(13)}<span>awesome-zhuiju-free</span>
                  </a>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;">
                  <input data-custom-name name="tvbox-custom-name" aria-label="Custom config name" type="text" value="${escapeHtml(customName)}" placeholder="Name (optional)" style="width:160px;height:40px;padding:0 14px;border-radius:9999px;background:#121212;border:1px solid rgba(255,255,255,0.1);font-size:12px;color:#fff;outline:none;" />
                  <input data-custom-url name="tvbox-custom-url" aria-label="Custom TVBox config URL" type="url" value="${escapeHtml(customUrl)}" placeholder="Paste TVBox config URL, e.g. https://raw.liucn.cc/box/m.json" style="flex:1;min-width:220px;height:40px;padding:0 16px;border-radius:9999px;background:#121212;border:1px solid rgba(255,255,255,0.1);font-size:12px;font-family:monospace;color:#fff;outline:none;" />
                  <button type="submit" ${customParsing || !customUrl.trim() ? "disabled" : ""} style="height:40px;padding:0 20px;border-radius:9999px;background:#fff;color:#000;font-size:12px;font-weight:600;cursor:pointer;opacity:${customParsing || !customUrl.trim() ? 0.4 : 1};">
                    ${customParsing ? "Parsing..." : "Parse & Import"}
                  </button>
                </div>
                ${
                  parseFeedback?.id === "custom"
                    ? `<p style="margin:0;font-size:12px;color:${parseFeedback.ok ? "#34d399" : "#fbbf24"};">${escapeHtml(parseFeedback.message)}</p>`
                    : ""
                }
              </form>
              <div style="display:flex;flex-direction:column;gap:12px;">
                ${configs
                  .map((cfg) => {
                    const isParsing = parsingId === cfg.id;
                    const fb = parseFeedback?.id === cfg.id ? parseFeedback : null;
                    return `
                      <div style="padding:16px;border-radius:16px;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;gap:10px;">
                        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;">
                          <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:14px;font-weight:700;color:#fff;">${escapeHtml(cfg.name)}</span>
                            <span style="font-size:11px;padding:2px 10px;border-radius:9999px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);">${cfg.type === "multi" ? "Multi-Repo" : "Single Repo"}</span>
                            ${cfg.cmsSiteCount ? `<span class="tabular-nums" style="font-size:11px;color:#34d399;font-family:monospace;">${cfg.cmsSiteCount} direct sources</span>` : ""}
                          </div>
                          <div style="display:flex;align-items:center;gap:8px;">
                            <button type="button" data-copy-cfg="${escapeHtml(cfg.id)}" data-copy-url="${escapeHtml(cfg.url)}" style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:9999px;font-size:12px;font-weight:500;background:rgba(23,23,23,0.7);border:1px solid rgba(255,255,255,0.14);color:#fff;cursor:pointer;">
                              ${copiedId === cfg.id ? `${icons.check("", 13)}<span>Copied</span>` : `${icons.copy(13)}<span>Copy URL</span>`}
                            </button>
                            <button type="button" data-sync-cfg="${escapeHtml(cfg.id)}" data-sync-url="${escapeHtml(cfg.url)}" data-sync-name="${escapeHtml(cfg.name)}" ${isParsing ? "disabled" : ""} style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:500;background:#fff;color:#000;cursor:pointer;opacity:${isParsing ? 0.5 : 1};">
                              ${icons.refreshCw("", 13)}<span>${isParsing ? "Syncing..." : "Sync Sources"}</span>
                            </button>
                          </div>
                        </div>
                        <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.55);">${escapeHtml(cfg.description)}</p>
                        <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-family:monospace;color:rgba(255,255,255,0.4);background:#121212;padding:6px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);overflow:hidden;">
                          ${icons.link2("", 13)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(cfg.url)}</span>
                        </div>
                        ${
                          fb
                            ? `<p style="margin:0;font-size:12px;color:${fb.ok ? "#34d399" : "#fcd34d"};">${escapeHtml(fb.message)}</p>`
                            : ""
                        }
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            `
        }
      </div>
    `;

    panel.querySelector("[data-close-modal]")?.addEventListener("click", handleClose);
    panel.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab === "configs" ? "configs" : "sources";
        render();
      });
    });
    panel.querySelector("[data-enable-all]")?.addEventListener("click", () => {
      disabledIds = [];
      setDisabledSiteIds([]);
      render();
    });
    panel.querySelector("[data-ping-all]")?.addEventListener("click", handlePingAll);
    panel.querySelectorAll<HTMLElement>("[data-toggle-site]").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.dataset.toggleSite) toggleSite(el.dataset.toggleSite);
      });
    });
    panel.querySelectorAll<HTMLButtonElement>("[data-copy-cfg]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.copyCfg || "";
        const url = btn.dataset.copyUrl || "";
        navigator.clipboard?.writeText(url).catch(() => {});
        copiedId = id;
        render();
        setTimeout(() => {
          if (!signal.aborted && copiedId === id) {
            copiedId = null;
            render();
          }
        }, 1800);
      });
    });
    panel.querySelectorAll<HTMLButtonElement>("[data-sync-cfg]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.syncCfg || "";
        const url = btn.dataset.syncUrl || "";
        const name = btn.dataset.syncName || "";
        handleSyncConfig(id, url, name);
      });
    });

    const form = panel.querySelector<HTMLFormElement>("[data-custom-form]");
    if (form) {
      const nameInput = form.querySelector<HTMLInputElement>("[data-custom-name]");
      const urlInput = form.querySelector<HTMLInputElement>("[data-custom-url]");
      nameInput?.addEventListener("input", () => {
        customName = nameInput.value;
      });
      urlInput?.addEventListener("input", () => {
        customUrl = urlInput.value;
        const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submit) submit.disabled = customParsing || !customUrl.trim();
      });
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!customUrl.trim()) return;
        customParsing = true;
        parseFeedback = null;
        render();
        try {
          const data = await api.parseTvboxConfig(
            customUrl.trim(),
            customName.trim() || "Custom TVBox",
            signal
          );
          if (data.sites) sites = data.sites;
          parseFeedback = {
            id: "custom",
            ok: data.result.ok,
            message: data.result.message || "Parsed successfully",
            subRepos: data.result.subRepos,
          };
          if (data.result.ok) {
            customUrl = "";
            customName = "";
          }
          window.dispatchEvent(new CustomEvent("tvbox-sources-updated"));
        } finally {
          customParsing = false;
          if (!signal.aborted) render();
        }
      });
    }
  };

  render();
  api
    .getTvboxConfigs(signal)
    .then((data) => {
      configs = data.configs || [];
      sites = data.sites || [];
    })
    .catch(() => {})
    .finally(() => {
      loading = false;
      if (!signal.aborted) render();
    });

  return { destroy };
}
