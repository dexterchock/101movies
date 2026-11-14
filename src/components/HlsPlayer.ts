import Hls from "hls.js";

export interface HlsPlayerOptions {
  src: string;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: () => void;
  onQualityDetected?: (quality: string) => void;
}

export interface HlsPlayerController {
  destroy: () => void;
  getVideoElement: () => HTMLVideoElement;
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
        if (!document.fullscreenElement) {
          if (video.requestFullscreen) {
            video.requestFullscreen().catch(() => {});
          } else if ((video as any).webkitRequestFullscreen) {
            (video as any).webkitRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          }
        }
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
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      ac.abort();
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
