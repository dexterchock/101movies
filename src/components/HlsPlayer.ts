import type HlsType from "hls.js";
import { buildVodProxyUrl, isBackupApiActive } from "../api";
import { stripM3u8Ads } from "../m3u8Filter";
import {
  createVideoUpscaler,
  isDesktopUpscaleSupported,
  VideoUpscalerController,
} from "./VideoUpscaler";

declare global {
  interface Window {
    Hls?: typeof HlsType;
  }
}

// NOTE: DO NOT statically import hls.js into the main IIFE (~160 KiB gzip savings on browse pages).
// Keep on-demand script loading, and keep iOS Safari on native HLS via hasStandardMSE().
const HLS_SCRIPT_URL = "/vendor/hls.light-1.7.4.min.js";
let hlsLoadPromise: Promise<typeof HlsType | null> | null = null;

function hasStandardMSE(): boolean {
  return (
    typeof window !== "undefined" &&
    (typeof (window as any).MediaSource === "function" ||
      typeof (window as any).WebKitMediaSource === "function")
  );
}

/**
 * Wraps Hls.js's built-in playlist loader via ES5-safe composition (no `class extends`)
 * so Samsung Tizen 4.0 / Chromium 56 works cleanly with the ES5 light bundle while
 * stripping confirmed spliced ad blocks before segments are queued.
 */
function createAdFilterPlaylistLoader(HlsCtor: typeof HlsType): any {
  const BaseLoader =
    (HlsCtor as any)?.DefaultConfig?.pLoader ||
    (HlsCtor as any)?.DefaultConfig?.loader;
  if (typeof BaseLoader !== "function") {
    return undefined;
  }

  function AdFilterPlaylistLoader(this: any, config: any) {
    this._inner = new BaseLoader(config);
  }

  Object.defineProperty(AdFilterPlaylistLoader.prototype, "context", {
    get: function (this: any) {
      return this._inner ? this._inner.context : null;
    },
    set: function (this: any, val: any) {
      if (this._inner) {
        this._inner.context = val;
      }
    },
  });

  Object.defineProperty(AdFilterPlaylistLoader.prototype, "stats", {
    get: function (this: any) {
      return this._inner ? this._inner.stats : null;
    },
    set: function (this: any, val: any) {
      if (this._inner) {
        this._inner.stats = val;
      }
    },
  });

  AdFilterPlaylistLoader.prototype.load = function (
    this: any,
    context: any,
    config: any,
    callbacks: any
  ) {
    const inner = this._inner;
    const isPlaylist =
      context && (context.type === "level" || context.type === "manifest");

    const wrappedCallbacks =
      isPlaylist && callbacks && typeof callbacks.onSuccess === "function"
        ? Object.assign({}, callbacks, {
            onSuccess: (
              response: any,
              stats: any,
              ctx: any,
              networkDetails: any
            ) => {
              let nextResponse = response;
              if (nextResponse && typeof nextResponse.data === "string") {
                const baseUrl =
                  (nextResponse.url as string | undefined) ||
                  (ctx && (ctx.url as string | undefined)) ||
                  undefined;
                const alreadyFilteredByProxy =
                  typeof baseUrl === "string" &&
                  /\/api\/vod\/proxy\b/i.test(baseUrl);
                if (!alreadyFilteredByProxy) {
                  try {
                    const filtered = stripM3u8Ads(nextResponse.data, baseUrl);
                    if (filtered.removedCount > 0) {
                      nextResponse = Object.assign({}, nextResponse, {
                        data: filtered.content,
                      });
                    }
                  } catch {
                    // Fall back to unfiltered manifest on unexpected parser errors
                  }
                }
              }
              callbacks.onSuccess(nextResponse, stats, ctx, networkDetails);
            },
          })
        : callbacks;

    return inner.load(context, config, wrappedCallbacks);
  };

  AdFilterPlaylistLoader.prototype.abort = function (this: any) {
    if (this._inner && typeof this._inner.abort === "function") {
      this._inner.abort();
    }
  };

  AdFilterPlaylistLoader.prototype.destroy = function (this: any) {
    if (this._inner && typeof this._inner.destroy === "function") {
      this._inner.destroy();
    }
  };

  AdFilterPlaylistLoader.prototype.getCacheAge = function (this: any) {
    if (this._inner && typeof this._inner.getCacheAge === "function") {
      return this._inner.getCacheAge();
    }
    return null;
  };

  AdFilterPlaylistLoader.prototype.getResponseHeader = function (
    this: any,
    name: string
  ) {
    if (this._inner && typeof this._inner.getResponseHeader === "function") {
      return this._inner.getResponseHeader(name);
    }
    return null;
  };

  return AdFilterPlaylistLoader;
}

/**
 * Lazy-loads the standalone Hls.js ES5 bundle when standard MSE playback is
 * available, skipping mobile Safari/iOS where native HLS is used.
 */
export function preloadHlsLibrary(): Promise<typeof HlsType | null> {
  if (!hasStandardMSE() || typeof document === "undefined") {
    return Promise.resolve(null);
  }
  if (window.Hls) {
    return Promise.resolve(window.Hls);
  }
  if (hlsLoadPromise) {
    return hlsLoadPromise;
  }

  hlsLoadPromise = new Promise<typeof HlsType | null>((resolve) => {
    const script = document.createElement("script");
    script.src = HLS_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      resolve(window.Hls ?? null);
    };
    script.onerror = () => {
      hlsLoadPromise = null;
      script.remove();
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return hlsLoadPromise;
}

export interface HlsPlayerOptions {
  src: string;
  initialTime?: number;
  isAnimation?: boolean;
  allowProxyFallback?: boolean;
  forceProxy?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPersistProgress?: (currentTime: number, duration: number) => void;
  onError?: () => void;
  onQualityDetected?: (quality: string) => void;
}

export interface HlsPlayerController {
  destroy: () => void;
  getVideoElement: () => HTMLVideoElement;
  enterUpscaleFullscreen: () => void;
  setUpscaleAnimation: (isAnimation: boolean) => void;
}

export function createHlsPlayer(
  container: HTMLElement,
  options: HlsPlayerOptions
): HlsPlayerController {
  const ac = new AbortController();
  const { signal } = ac;

  const video = document.createElement("video");
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  video.className = "player-video";
  container.replaceChildren(video);

  let upscaler: VideoUpscalerController | null = null;
  let isUpscaleMode = false;
  let exitingAllFullscreen = false;
  let controlsTimer: ReturnType<typeof setTimeout> | null = null;
  let pointerInControlsZone = false;

  let hls: HlsType | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let playbackGen = 0;
  let pendingSeek = options.initialTime ?? 0;

  const allowProxyFallback = options.allowProxyFallback !== false;
  const isHttpOnHttps =
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    options.src.startsWith("http://");

  let useProxy =
    Boolean(options.forceProxy) || (allowProxyFallback && isHttpOnHttps);

  const getEffectiveSrc = () => {
    if (useProxy) {
      return buildVodProxyUrl(options.src, "full");
    }
    if (isHttpOnHttps) {
      return options.src.replace(/^http:\/\//i, "https://");
    }
    return options.src;
  };

  const exitCurrentFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    }
  };

  const toggleNormalFullscreen = () => {
    const fsEl =
      document.fullscreenElement || (document as any).webkitFullscreenElement;
    if (!fsEl) {
      if (video.requestFullscreen) {
        try {
          video
            .requestFullscreen({ navigationUI: "hide" } as FullscreenOptions)
            .catch(() => {});
        } catch {
          video.requestFullscreen().catch(() => {});
        }
      } else if ((video as any).webkitRequestFullscreen) {
        (video as any).webkitRequestFullscreen();
      }
    } else {
      exitCurrentFullscreen();
    }
  };

  const syncControlsVisibility = (keepOpen = false) => {
    if (destroyed) return;
    if (controlsTimer) {
      clearTimeout(controlsTimer);
      controlsTimer = null;
    }
    const shouldStayVisible =
      video.paused || video.ended || pointerInControlsZone;

    if (keepOpen || shouldStayVisible) {
      container.classList.add("is-controls-visible");
      if (!shouldStayVisible) {
        controlsTimer = setTimeout(() => {
          if (!destroyed && !video.paused && !video.ended && !pointerInControlsZone) {
            container.classList.remove("is-controls-visible");
          }
        }, 2500);
      }
    } else {
      container.classList.remove("is-controls-visible");
    }
  };

  const disableUpscaleFullscreen = () => {
    isUpscaleMode = false;
    container.classList.remove("is-upscaling");
    upscaler?.setEnabled(false);
  };

  const enterUpscaleFullscreen = () => {
    if (destroyed || !upscaler) return;
    exitingAllFullscreen = false;
    const fsEl =
      document.fullscreenElement || (document as any).webkitFullscreenElement;
    if (fsEl === container) {
      isUpscaleMode = true;
      upscaler.setEnabled(true);
      return;
    }
    if (fsEl) {
      disableUpscaleFullscreen();
      return;
    }

    isUpscaleMode = true;
    upscaler.setEnabled(true);
    if (container.requestFullscreen) {
      try {
        container
          .requestFullscreen({ navigationUI: "hide" } as FullscreenOptions)
          .catch(() => {
            disableUpscaleFullscreen();
          });
      } catch {
        container.requestFullscreen().catch(() => {
          disableUpscaleFullscreen();
        });
      }
    } else if ((container as any).webkitRequestFullscreen) {
      (container as any).webkitRequestFullscreen();
    } else {
      disableUpscaleFullscreen();
    }
  };

  if (isDesktopUpscaleSupported()) {
    upscaler = createVideoUpscaler({
      container,
      video,
      initialEnabled: false,
      isAnimation: Boolean(options.isAnimation),
      onActiveChange: (active) => {
        container.classList.toggle("is-upscaling", active && isUpscaleMode);
        if (active && isUpscaleMode) {
          syncControlsVisibility(true);
        }
      },
      onTaintedSource: () => {
        if (destroyed || useProxy) return;
        pendingSeek = video.currentTime || pendingSeek;
        useProxy = true;
        video.crossOrigin = "anonymous";
        void startPlayback();
      },
    });
  }

  const applyInitialSeekAndPlay = () => {
    if (destroyed) return;
    if (pendingSeek > 0) {
      if (Math.abs(video.currentTime - pendingSeek) > 2) {
        try {
          video.currentTime = pendingSeek;
        } catch {}
      }
      pendingSeek = 0;
    }
    video.play().catch(() => {});
  };

  const checkResolution = (w: number, h: number) => {
    if (destroyed || (w <= 0 && h <= 0)) return;
    if (w >= 3800 || h >= 2000) options.onQualityDetected?.("4K");
    else if (w >= 2400 || h >= 1400) options.onQualityDetected?.("2K");
    else if (w >= 1800 || h >= 800) options.onQualityDetected?.("1080P");
    else if (w >= 1200 || h >= 600) options.onQualityDetected?.("720P");
    else options.onQualityDetected?.("SD");
  };

  const handleVideoDims = () => {
    checkResolution(video.videoWidth, video.videoHeight);
  };

  video.addEventListener("loadedmetadata", handleVideoDims, { signal });
  video.addEventListener("resize", handleVideoDims, { signal });
  video.addEventListener(
    "timeupdate",
    () => {
      if (video.currentTime > 0) {
        options.onTimeUpdate?.(video.currentTime, video.duration || 0);
      }
    },
    { signal }
  );
  video.addEventListener(
    "error",
    () => {
      if (destroyed || hls !== null) return;
      if (!useProxy && allowProxyFallback && !isBackupApiActive()) {
        pendingSeek = video.currentTime || pendingSeek;
        useProxy = true;
        void startPlayback();
      } else {
        options.onError?.();
      }
    },
    { signal }
  );

  const destroyHlsInstance = () => {
    if (hls) {
      try {
        hls.stopLoad();
      } catch {}
      try {
        hls.detachMedia();
      } catch {}
      try {
        hls.destroy();
      } catch {}
      hls = null;
    }
  };

  const startPlayback = async () => {
    if (destroyed || !options.src) return;
    const gen = ++playbackGen;
    destroyHlsInstance();
    const effectiveSrc = getEffectiveSrc();
    const isMp4 =
      options.src.toLowerCase().includes(".mp4") &&
      !options.src.toLowerCase().includes(".m3u8");

    if (isMp4) {
      video.src = effectiveSrc;
      video.addEventListener(
        "loadedmetadata",
        () => {
          if (destroyed || gen !== playbackGen) return;
          applyInitialSeekAndPlay();
          handleVideoDims();
        },
        { once: true, signal }
      );
      return;
    }

    const Hls = hasStandardMSE()
      ? window.Hls || (await preloadHlsLibrary())
      : null;
    if (destroyed || gen !== playbackGen) return;

    if (Hls && Hls.isSupported()) {
      let mediaErrorRetries = 0;
      const pLoader = createAdFilterPlaylistLoader(Hls);
      // NOTE: DO NOT raise buffer limits; capped for low-RAM Smart TVs (Samsung Tizen 4.0) to avoid OOM crashes.
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 60,
        maxBufferSize: 60000000,
        backBufferLength: 30,
        startPosition: pendingSeek > 0 ? pendingSeek : -1,
        startFragPrefetch: true,
        testBandwidth: false,
        ...(pLoader ? { pLoader } : {}),
        manifestLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 8000,
            maxLoadTimeMs: 12000,
            timeoutRetry: {
              maxNumRetry: 1,
              retryDelayMs: 500,
              maxRetryDelayMs: 2000,
            },
            errorRetry: {
              maxNumRetry: 1,
              retryDelayMs: 500,
              maxRetryDelayMs: 2000,
            },
          },
        },
        fragLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 8000,
            maxLoadTimeMs: 15000,
            timeoutRetry: {
              maxNumRetry: 2,
              retryDelayMs: 500,
              maxRetryDelayMs: 2000,
            },
            errorRetry: {
              maxNumRetry: 2,
              retryDelayMs: 500,
              maxRetryDelayMs: 2000,
            },
          },
        },
      });

      hls.loadSource(effectiveSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (destroyed || gen !== playbackGen) return;
        applyInitialSeekAndPlay();
        if (Array.isArray(data.levels) && data.levels.length > 0) {
          const maxW = Math.max(...data.levels.map((l) => l.width || 0));
          const maxH = Math.max(...data.levels.map((l) => l.height || 0));
          checkResolution(maxW, maxH);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (destroyed || gen !== playbackGen || !data.fatal) return;
        if (
          data.type === Hls.ErrorTypes.NETWORK_ERROR &&
          !useProxy &&
          allowProxyFallback &&
          !isBackupApiActive()
        ) {
          pendingSeek = video.currentTime || pendingSeek;
          destroyHlsInstance();
          useProxy = true;
          void startPlayback();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          mediaErrorRetries++;
          if (mediaErrorRetries === 1) {
            hls?.recoverMediaError();
          } else if (mediaErrorRetries === 2) {
            if (typeof hls?.swapAudioCodec === "function") {
              hls.swapAudioCodec();
            }
            hls?.recoverMediaError();
          } else {
            destroyHlsInstance();
            options.onError?.();
          }
        } else {
          destroyHlsInstance();
          options.onError?.();
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      const alreadyProxied = options.src.startsWith("/api/vod/proxy");
      video.src =
        useProxy || alreadyProxied
          ? effectiveSrc
          : buildVodProxyUrl(options.src, "manifest");
      video.addEventListener(
        "loadedmetadata",
        () => {
          if (destroyed || gen !== playbackGen) return;
          applyInitialSeekAndPlay();
          handleVideoDims();
        },
        { once: true, signal }
      );
    } else {
      options.onError?.();
    }
  };

  // Auto-release focus so native fullscreen controls auto-hide on idle
  const releaseFocus = () => {
    if (destroyed) return;
    try {
      const active = document.activeElement;
      if (active instanceof HTMLElement && (active === video || video.contains(active))) {
        active.blur();
      }
      video.blur();
    } catch {}
  };

  const updateControlsHoverZone = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    pointerInControlsZone = rect.height > 0 && rect.bottom - e.clientY <= 96;
    syncControlsVisibility(true);
  };

  container.addEventListener("pointermove", updateControlsHoverZone, { signal });
  container.addEventListener(
    "pointerdown",
    (e) => {
      updateControlsHoverZone(e);
    },
    { signal }
  );
  container.addEventListener(
    "pointerleave",
    () => {
      pointerInControlsZone = false;
      syncControlsVisibility(false);
    },
    { signal }
  );

  // Double-click exits Upscale Fullscreen cleanly (triggers fullscreenchange -> auto-off)
  container.addEventListener(
    "dblclick",
    (e) => {
      if (!isUpscaleMode) return;
      e.preventDefault();
      e.stopPropagation();
      exitCurrentFullscreen();
    },
    { capture: true, signal }
  );

  video.addEventListener(
    "enterpictureinpicture",
    () => {
      if (!isUpscaleMode) return;
      disableUpscaleFullscreen();
      const fsEl =
        document.fullscreenElement || (document as any).webkitFullscreenElement;
      if (fsEl === container) {
        exitCurrentFullscreen();
      }
    },
    { signal }
  );

  video.addEventListener("play", () => syncControlsVisibility(false), { signal });
  video.addEventListener(
    "pause",
    () => {
      syncControlsVisibility(true);
      if (!destroyed && video.currentTime > 0) {
        options.onPersistProgress?.(video.currentTime, video.duration || 0);
      }
    },
    { signal }
  );
  video.addEventListener(
    "seeked",
    () => {
      if (!destroyed && video.currentTime > 0) {
        options.onPersistProgress?.(video.currentTime, video.duration || 0);
      }
    },
    { signal }
  );
  video.addEventListener("ended", () => syncControlsVisibility(true), { signal });

  video.addEventListener(
    "pointermove",
    () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(releaseFocus, 2500);
    },
    { signal }
  );

  video.addEventListener(
    "pointerleave",
    () => {
      if (idleTimer) clearTimeout(idleTimer);
      releaseFocus();
    },
    { signal }
  );

  video.addEventListener(
    "pointerdown",
    () => {
      setTimeout(releaseFocus, 150);
    },
    { signal }
  );

  const handleFullscreenChange = () => {
    const fsEl =
      document.fullscreenElement || (document as any).webkitFullscreenElement;
    if (exitingAllFullscreen) {
      if (!fsEl) {
        exitingAllFullscreen = false;
      } else {
        exitCurrentFullscreen();
      }
    } else if (isUpscaleMode) {
      if (!fsEl) {
        disableUpscaleFullscreen();
      } else if (fsEl === video) {
        // Native fullscreen button pushed <video> on top of container; pop the whole stack
        exitingAllFullscreen = true;
        disableUpscaleFullscreen();
        exitCurrentFullscreen();
      }
    }
    syncControlsVisibility(true);
    setTimeout(releaseFocus, 100);
    setTimeout(releaseFocus, 400);
  };
  document.addEventListener("fullscreenchange", handleFullscreenChange, { signal });
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange, {
    signal,
  });
  document.addEventListener(
    "fullscreenerror",
    () => {
      if (isUpscaleMode) disableUpscaleFullscreen();
    },
    { signal }
  );

  window.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const activeEl = (document.activeElement || e.target) as HTMLElement | null;
      const tag = activeEl?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        activeEl?.isContentEditable
      ) {
        return;
      }
      const isInteractiveControl =
        tag === "button" ||
        tag === "a" ||
        Boolean(
          activeEl?.closest(
            ".player-bottom-bar, .back-btn, .episodes-popover, .modal-backdrop"
          )
        );
      if (
        !document.fullscreenElement &&
        isInteractiveControl &&
        (e.code === "Space" || e.code === "ArrowLeft" || e.code === "ArrowRight")
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (video.paused) video.play().catch(() => {});
        else video.pause();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (e.code === "KeyF") {
        e.preventDefault();
        toggleNormalFullscreen();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        video.muted = !video.muted;
      }
    },
    { signal }
  );

  void startPlayback();

  return {
    getVideoElement: () => video,
    enterUpscaleFullscreen,
    setUpscaleAnimation(isAnimation: boolean) {
      if (destroyed) return;
      upscaler?.setAnimation(isAnimation);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      playbackGen++;
      isUpscaleMode = false;
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      if (controlsTimer) {
        clearTimeout(controlsTimer);
        controlsTimer = null;
      }
      ac.abort();
      upscaler?.destroy();
      upscaler = null;
      container.classList.remove("is-upscaling", "is-controls-visible");
      destroyHlsInstance();
      try {
        video.pause();
      } catch {}
      video.removeAttribute("src");
      try {
        video.load();
      } catch {}
      video.remove();
    },
  };
}
