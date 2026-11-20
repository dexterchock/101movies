import type WebSRType from "@websr/websr";
import type WebSRWebGLType from "@websr/webgl";
import type { MediaDetails } from "../types";

type UpscaleStyle = "an" | "rl";
type UpscaleEngine = WebSRType | WebSRWebGLType;

declare global {
  interface Window {
    WebSR?: typeof WebSRType;
    WebSRWebGL?: typeof WebSRWebGLType;
  }
}

const WEBSR_SCRIPT_URL = "/upscaler/websr.js";
const WEBSR_WEBGL_SCRIPT_URL = "/upscaler/websr-webgl.js";

const scriptPromises = new Map<string, Promise<void>>();
const weightPromises = new Map<string, Promise<unknown>>();

const UNSUPPORTED_UA_RE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk|Kindle|Tizen|Web0S|WebOS|SmartTV|SMART-TV|BRAVIA|AFT|FireTV|Roku|Viera|NetCast|HbbTV|AppleTV|Xbox|PlayStation|Nintendo|CrKey/i;

/**
 * Checks whether the current browser is a capable desktop/PC environment
 * where client-side WebGPU/WebGL2 upscaling should be exposed.
 * Excludes Smart TVs, mobile/touch devices, and legacy browsers (e.g. Tizen Chrome 56).
 */
export function isDesktopUpscaleSupported(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  if (
    !("AbortController" in window) ||
    !("Promise" in window) ||
    document.documentElement.classList.contains("no-focus-visible")
  ) {
    return false;
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  if (UNSUPPORTED_UA_RE.test(ua)) {
    return false;
  }

  if (typeof window.matchMedia === "function") {
    const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (!fineHover || coarsePointer) {
      return false;
    }
  } else if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) {
    return false;
  }

  const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
  const hasWebGL2 = typeof WebGL2RenderingContext !== "undefined";
  return hasWebGPU || hasWebGL2;
}

/**
 * Infers whether the title should use the anime model from TMDB genres.
 */
export function isAnimationTitle(details: MediaDetails | null | undefined): boolean {
  if (!details || !Array.isArray(details.genres)) return false;
  return details.genres.some(
    (g) =>
      g.id === 16 || /animation|anime|动画|動畫/i.test(String(g.name || ""))
  );
}

function isAbove1080p(video: HTMLVideoElement): boolean {
  const w = video.videoWidth;
  const h = video.videoHeight;
  return w > 2048 || h > 1152;
}

function loadScriptOnce(src: string): Promise<void> {
  const existing = scriptPromises.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromises.delete(src);
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });

  scriptPromises.set(src, promise);
  return promise;
}

async function loadWebSR(): Promise<typeof WebSRType | null> {
  if (window.WebSR) return window.WebSR;
  await loadScriptOnce(WEBSR_SCRIPT_URL);
  return window.WebSR ?? null;
}

async function loadWebSRWebGL(): Promise<typeof WebSRWebGLType | null> {
  if (window.WebSRWebGL) return window.WebSRWebGL;
  await loadScriptOnce(WEBSR_WEBGL_SCRIPT_URL);
  return window.WebSRWebGL ?? null;
}

function loadWeights(path: string): Promise<unknown> {
  const existing = weightPromises.get(path);
  if (existing) return existing;

  const promise = fetch(path).then((res) => {
    if (!res.ok) {
      weightPromises.delete(path);
      throw new Error(`HTTP ${res.status} fetching ${path}`);
    }
    return res.json();
  });

  weightPromises.set(path, promise);
  return promise;
}

export interface VideoUpscalerOptions {
  container: HTMLElement;
  video: HTMLVideoElement;
  initialEnabled?: boolean;
  isAnimation?: boolean;
  onActiveChange?: (active: boolean) => void;
  onTaintedSource?: () => void;
}

export interface VideoUpscalerController {
  setEnabled: (enabled: boolean) => void;
  setAnimation: (isAnimation: boolean) => void;
  isActive: () => boolean;
  destroy: () => void;
}

export function createVideoUpscaler(
  options: VideoUpscalerOptions
): VideoUpscalerController {
  const { container, video } = options;
  const ac = new AbortController();
  const { signal } = ac;

  let enabled = Boolean(options.initialEnabled);
  let style: UpscaleStyle = options.isAnimation ? "an" : "rl";
  let destroyed = false;

  let canvas: HTMLCanvasElement | null = null;
  let engine: UpscaleEngine | null = null;
  let gpuDevice: any = null;
  let backend: "webgpu" | "webgl" | null = null;
  let sessionSeq = 0;

  let isOverlayVisible = false;
  let isRendering = false;
  let rerenderPending = false;
  let inFlightRender: Promise<void> | null = null;
  let rvfcId: number | null = null;
  let rafId: number | null = null;
  let taintReported = false;

  const supportsRvfc =
    typeof (video as any).requestVideoFrameCallback === "function" &&
    typeof (video as any).cancelVideoFrameCallback === "function";

  const notifyActive = (next: boolean) => {
    if (isOverlayVisible === next) return;
    isOverlayVisible = next;
    options.onActiveChange?.(next);
  };

  const cancelScheduledFrame = () => {
    if (rvfcId !== null && supportsRvfc) {
      try {
        (video as any).cancelVideoFrameCallback(rvfcId);
      } catch {}
      rvfcId = null;
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const clearCanvasElement = () => {
    if (canvas) {
      canvas.remove();
      canvas = null;
    }
  };

  const teardownSession = () => {
    sessionSeq += 1;
    cancelScheduledFrame();
    rerenderPending = false;
    notifyActive(false);

    const activeEngine = engine;
    const activeGpu = gpuDevice;
    const activeCanvas = canvas;
    engine = null;
    gpuDevice = null;
    canvas = null;
    backend = null;

    const finalize = () => {
      if (activeEngine) {
        try {
          (activeEngine as any).context?.cleanup?.();
        } catch {}
        activeEngine.destroy().catch(() => {});
      }
      if (activeGpu) {
        try {
          activeGpu.destroy?.();
        } catch {}
      }
      if (activeCanvas) {
        activeCanvas.remove();
      }
    };

    if (inFlightRender) {
      inFlightRender.finally(finalize);
    } else {
      finalize();
    }
  };

  const renderSingleFrame = (seq: number) => {
    if (
      destroyed ||
      !enabled ||
      seq !== sessionSeq ||
      !engine ||
      !canvas
    ) {
      return;
    }
    if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      return;
    }
    if (isAbove1080p(video)) {
      // Stream exceeds 1080p (2K/4K) - keep raw video active and suspend canvas
      clearCanvasElement();
      teardownSession();
      return;
    }

    if (isRendering) {
      rerenderPending = true;
      return;
    }

    isRendering = true;
    const currentEngine = engine;
    const currentCanvas = canvas;

    inFlightRender = currentEngine
      .render(video)
      .then(() => {
        if (!destroyed && enabled && seq === sessionSeq && currentCanvas.isConnected) {
          if (!currentCanvas.classList.contains("is-ready")) {
            currentCanvas.classList.add("is-ready");
          }
          notifyActive(true);
        }
      })
      .catch((err: any) => {
        if (destroyed || seq !== sessionSeq) return;
        const msg = String(err?.name || "") + " " + String(err?.message || "");
        if (/SecurityError|tainted|cross-origin/i.test(msg)) {
          teardownSession();
          if (!taintReported) {
            taintReported = true;
            options.onTaintedSource?.();
          }
          return;
        }
        teardownSession();
      })
      .finally(() => {
        isRendering = false;
        inFlightRender = null;
        if (destroyed || !enabled || seq !== sessionSeq || !engine) {
          rerenderPending = false;
          return;
        }
        if (!video.paused && !video.ended) {
          rerenderPending = false;
          scheduleNextFrame(seq);
        } else if (rerenderPending) {
          rerenderPending = false;
          renderSingleFrame(seq);
        }
      });
  };

  const scheduleNextFrame = (seq: number) => {
    if (destroyed || !enabled || seq !== sessionSeq || !engine) return;
    if (isRendering && !video.paused && !video.ended) return;
    cancelScheduledFrame();

    if (video.paused || video.ended) {
      renderSingleFrame(seq);
      return;
    }

    if (supportsRvfc) {
      rvfcId = (video as any).requestVideoFrameCallback(() => {
        rvfcId = null;
        if (destroyed || !enabled || seq !== sessionSeq) return;
        renderSingleFrame(seq);
      });
    } else {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (destroyed || !enabled || seq !== sessionSeq) return;
        renderSingleFrame(seq);
      });
    }
  };

  const startSession = async () => {
    if (destroyed || !enabled || engine) return;
    if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      return;
    }
    if (isAbove1080p(video)) {
      notifyActive(false);
      return;
    }

    const seq = ++sessionSeq;
    const activeStyle = style;

    try {
      const WebSR = await loadWebSR();
      if (destroyed || !enabled || seq !== sessionSeq) return;

      let nextCanvas = document.createElement("canvas");
      nextCanvas.className = "player-upscale-canvas";
      nextCanvas.setAttribute("aria-hidden", "true");

      let nextEngine: UpscaleEngine | null = null;
      let nextGpu: any = null;
      let nextBackend: "webgpu" | "webgl" | null = null;

      if (WebSR) {
        let gpu: Awaited<ReturnType<typeof WebSRType.initWebGPU>> = false;
        try {
          gpu = await WebSR.initWebGPU();
        } catch {
          gpu = false;
        }

        if (destroyed || !enabled || seq !== sessionSeq) {
          if (gpu) {
            try {
              gpu.destroy();
            } catch {}
          }
          return;
        }

        if (gpu) {
          try {
            const weights = await loadWeights(
              `/upscaler/weights/cnn-2x-m-${activeStyle}.json`
            );
            if (destroyed || !enabled || seq !== sessionSeq) {
              gpu.destroy();
              return;
            }
            // NOTE: Keep WebGPU on cnn-2x-m + tier 3 (single-tile); cnn-2x-l hitches on mid-range GPUs.
            nextEngine = new WebSR({
              canvas: nextCanvas,
              network_name: "anime4k/cnn-2x-m",
              weights,
              gpu,
              tier: { tier: 3, isMobile: false } as any,
            });
            nextGpu = gpu;
            nextBackend = "webgpu";
            gpu.lost
              ?.then(() => {
                if (!destroyed && seq === sessionSeq && nextBackend === "webgpu") {
                  teardownSession();
                }
              })
              .catch(() => {});
          } catch {
            try {
              gpu.destroy();
            } catch {}
            nextEngine = null;
            nextGpu = null;
          }
        }
      }

      if (!nextEngine) {
        // Fresh canvas required if a prior WebGPU context touched the previous element
        nextCanvas = document.createElement("canvas");
        nextCanvas.className = "player-upscale-canvas";
        nextCanvas.setAttribute("aria-hidden", "true");

        const WebSRWebGL = await loadWebSRWebGL();
        if (destroyed || !enabled || seq !== sessionSeq || !WebSRWebGL) return;

        const gl = WebSRWebGL.initWebGL(nextCanvas);
        if (!gl || !WebSRWebGL.supportsNetwork("anime4k/cnn-2x-l", gl)) {
          return;
        }

        const weights = await loadWeights(
          `/upscaler/weights/cnn-2x-l-${activeStyle}.json`
        );
        if (destroyed || !enabled || seq !== sessionSeq) return;

        nextEngine = new WebSRWebGL({
          canvas: nextCanvas,
          gl,
          network_name: "anime4k/cnn-2x-l",
          weights,
          tier: { tier: 3, isMobile: false } as any,
        });
        nextBackend = "webgl";
      }

      if (destroyed || !enabled || seq !== sessionSeq || !nextEngine) {
        try {
          (nextEngine as any)?.context?.cleanup?.();
        } catch {}
        nextEngine?.destroy().catch(() => {});
        try {
          nextGpu?.destroy?.();
        } catch {}
        return;
      }

      container.appendChild(nextCanvas);
      canvas = nextCanvas;
      engine = nextEngine;
      gpuDevice = nextGpu;
      backend = nextBackend;

      renderSingleFrame(seq);
      if (!video.paused && !video.ended) {
        scheduleNextFrame(seq);
      }
    } catch {
      if (seq === sessionSeq) {
        teardownSession();
      }
    }
  };

  const evaluatePlaybackState = () => {
    if (destroyed) return;
    if (!enabled) {
      if (engine || canvas) teardownSession();
      return;
    }
    if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      return;
    }
    if (isAbove1080p(video)) {
      if (engine || canvas) teardownSession();
      return;
    }
    if (!engine) {
      void startSession();
    } else if (!video.paused && !video.ended) {
      scheduleNextFrame(sessionSeq);
    } else {
      renderSingleFrame(sessionSeq);
    }
  };

  video.addEventListener("loadeddata", evaluatePlaybackState, { signal });
  video.addEventListener("loadedmetadata", evaluatePlaybackState, { signal });
  video.addEventListener("resize", evaluatePlaybackState, { signal });
  video.addEventListener("playing", evaluatePlaybackState, { signal });
  video.addEventListener("play", evaluatePlaybackState, { signal });
  video.addEventListener("seeked", () => {
    if (!destroyed && enabled && engine) {
      renderSingleFrame(sessionSeq);
    }
  }, { signal });
  video.addEventListener("pause", () => {
    cancelScheduledFrame();
    if (!destroyed && enabled && engine) {
      renderSingleFrame(sessionSeq);
    }
  }, { signal });
  video.addEventListener("ended", cancelScheduledFrame, { signal });

  if (enabled) {
    evaluatePlaybackState();
  }

  return {
    setEnabled(nextEnabled: boolean) {
      if (destroyed || enabled === nextEnabled) return;
      enabled = nextEnabled;
      taintReported = false;
      if (enabled) {
        evaluatePlaybackState();
      } else {
        teardownSession();
      }
    },
    setAnimation(isAnim: boolean) {
      const nextStyle: UpscaleStyle = isAnim ? "an" : "rl";
      if (style === nextStyle) return;
      style = nextStyle;
      if (!enabled || !engine) return;

      const seq = sessionSeq;
      const activeBackend = backend;
      const useWebGL = activeBackend === "webgl";
      const weightsUrl = useWebGL
        ? `/upscaler/weights/cnn-2x-l-${style}.json`
        : `/upscaler/weights/cnn-2x-m-${style}.json`;

      loadWeights(weightsUrl)
        .then((weights) => {
          if (
            destroyed ||
            !enabled ||
            seq !== sessionSeq ||
            !engine ||
            backend !== activeBackend
          ) {
            return;
          }
          if (useWebGL) {
            engine.switchNetwork("anime4k/cnn-2x-l", weights);
          } else {
            (
              engine as {
                switchNetwork(network: "anime4k/cnn-2x-m", weights: unknown): void;
              }
            ).switchNetwork("anime4k/cnn-2x-m", weights);
          }
          renderSingleFrame(seq);
        })
        .catch(() => {});
    },
    isActive: () => isOverlayVisible,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      ac.abort();
      teardownSession();
    },
  };
}
