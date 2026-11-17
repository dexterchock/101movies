import Hls from "hls.js";
import { icons } from "../icons";
import {
  createVideoUpscaler,
  isDesktopUpscaleSupported,
  VideoUpscalerController,
} from "./VideoUpscaler";

export interface HlsPlayerOptions {
  src: string;
  initialTime?: number;
  upscaleEnabled?: boolean;
  isAnimation?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: () => void;
  onQualityDetected?: (quality: string) => void;
}

export interface HlsPlayerController {
  destroy: () => void;
  getVideoElement: () => HTMLVideoElement;
  setUpscaleEnabled: (enabled: boolean) => void;
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

  let fsBtn: HTMLButtonElement | null = null;
  let upscaler: VideoUpscalerController | null = null;
  let upscalerActive = false;
  let controlsTimer: ReturnType<typeof setTimeout> | null = null;
  let pointerInControlsZone = false;

  let hls: Hls | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let pendingSeek = options.initialTime ?? 0;

  let useProxy =
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    options.src.startsWith("http://");

  const getEffectiveSrc = () =>
    useProxy
      ? `/api/vod/proxy?url=${encodeURIComponent(options.src)}`
      : options.src;

  const updateFsBtnIcon = () => {
    if (!fsBtn) return;
    const isFs = Boolean(
      document.fullscreenElement || (document as any).webkitFullscreenElement
    );
    fsBtn.setAttribute(
      "aria-label",
      isFs ? "Exit full screen" : "Enter full screen"
    );
    fsBtn.innerHTML = isFs
      ? icons.minimize("player-upscale-fs-icon", 18)
      : icons.maximize("player-upscale-fs-icon", 18);
  };

  const toggleFullscreen = () => {
    const target: HTMLElement = upscalerActive ? container : video;
    const fsEl =
      document.fullscreenElement || (document as any).webkitFullscreenElement;
    if (!fsEl) {
      if (target.requestFullscreen) {
        try {
          target
            .requestFullscreen({ navigationUI: "hide" } as FullscreenOptions)
            .catch(() => {});
        } catch {
          target.requestFullscreen().catch(() => {});
        }
      } else if ((target as any).webkitRequestFullscreen) {
        (target as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  const syncControlsVisibility = (keepOpen = false) => {
    if (destroyed) return;
    if (controlsTimer) {
      clearTimeout(controlsTimer);
      controlsTimer = null;
    }
    const shouldStayVisible =
      video.paused ||
      video.ended ||
      pointerInControlsZone ||
      Boolean(fsBtn && document.activeElement === fsBtn);

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

  if (isDesktopUpscaleSupported()) {
    fsBtn = document.createElement("button");
    fsBtn.type = "button";
    fsBtn.className = "player-upscale-fs-btn";
    fsBtn.tabIndex = 0;
    updateFsBtnIcon();
    fsBtn.addEventListener("mousedown", (e) => e.stopPropagation(), { signal });
    fsBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFullscreen();
        fsBtn?.blur();
      },
      { signal }
    );
    container.appendChild(fsBtn);

    upscaler = createVideoUpscaler({
      container,
      video,
      initialEnabled: Boolean(options.upscaleEnabled),
      isAnimation: Boolean(options.isAnimation),
      onActiveChange: (active) => {
        upscalerActive = active;
        container.classList.toggle("is-upscaling", active);
        if (active) {
          video.setAttribute("controlsList", "nofullscreen");
          syncControlsVisibility(true);
        } else {
          video.removeAttribute("controlsList");
        }
        updateFsBtnIcon();
      },
      onTaintedSource: () => {
        if (destroyed || useProxy) return;
        pendingSeek = video.currentTime || pendingSeek;
        useProxy = true;
        video.crossOrigin = "anonymous";
        startPlayback();
      },
    });
  }

  const applyInitialSeekAndPlay = () => {
    if (destroyed) return;
    if (pendingSeek > 0) {
      try {
        video.currentTime = pendingSeek;
      } catch {}
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

  const startPlayback = () => {
    if (destroyed || !options.src) return;
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
          applyInitialSeekAndPlay();
          handleVideoDims();
        },
        { once: true, signal }
      );
      return;
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 60,
        maxBufferSize: 60000000,
        backBufferLength: 30,
      });

      hls.loadSource(effectiveSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        applyInitialSeekAndPlay();
        if (Array.isArray(data.levels) && data.levels.length > 0) {
          const maxW = Math.max(...data.levels.map((l) => l.width || 0));
          const maxH = Math.max(...data.levels.map((l) => l.height || 0));
          checkResolution(maxW, maxH);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (destroyed || !data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !useProxy) {
          destroyHlsInstance();
          useProxy = true;
          startPlayback();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
        } else {
          options.onError?.();
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = effectiveSrc;
      video.addEventListener(
        "loadedmetadata",
        () => {
          applyInitialSeekAndPlay();
          handleVideoDims();
        },
        { once: true, signal }
      );
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

  // When upscaling is active, capture double-click so container (with canvas) enters fullscreen
  container.addEventListener(
    "dblclick",
    (e) => {
      if (!upscalerActive) return;
      if (fsBtn && fsBtn.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
      toggleFullscreen();
    },
    { capture: true, signal }
  );

  video.addEventListener("play", () => syncControlsVisibility(false), { signal });
  video.addEventListener("pause", () => syncControlsVisibility(true), { signal });
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
    updateFsBtnIcon();
    syncControlsVisibility(true);
    setTimeout(releaseFocus, 100);
    setTimeout(releaseFocus, 400);
  };
  document.addEventListener("fullscreenchange", handleFullscreenChange, { signal });
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange, {
    signal,
  });

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
        toggleFullscreen();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        video.muted = !video.muted;
      }
    },
    { signal }
  );

  startPlayback();

  return {
    getVideoElement: () => video,
    setUpscaleEnabled(enabled: boolean) {
      if (destroyed) return;
      upscaler?.setEnabled(enabled);
    },
    setUpscaleAnimation(isAnimation: boolean) {
      if (destroyed) return;
      upscaler?.setAnimation(isAnimation);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
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
      fsBtn?.remove();
      fsBtn = null;
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
