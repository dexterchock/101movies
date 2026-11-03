import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface HlsPlayerProps {
  src: string;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: () => void;
}

export function HlsPlayer({
  src,
  initialTime = 0,
  onTimeUpdate,
  onError,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useProxy, setUseProxy] = useState(false);
  const pendingSeekRef = useRef<number>(initialTime);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    pendingSeekRef.current = initialTime;
  }, [src, initialTime]);

  // Reset proxy state whenever src changes; force proxy immediately if http:// on https:// page
  useEffect(() => {
    const isHttpOnHttps =
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      src.startsWith("http://");
    setUseProxy(isHttpOnHttps);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const effectiveSrc = useProxy
      ? `/api/vod/proxy?url=${encodeURIComponent(src)}`
      : src;

    let hls: Hls | null = null;
    const isMp4 =
      src.toLowerCase().includes(".mp4") &&
      !src.toLowerCase().includes(".m3u8");

    const applyInitialSeekAndPlay = () => {
      if (pendingSeekRef.current && pendingSeekRef.current > 0) {
        try {
          video.currentTime = pendingSeekRef.current;
        } catch {}
        pendingSeekRef.current = 0;
      }
      video.play().catch(() => {});
    };

    if (isMp4) {
      video.src = effectiveSrc;
      const handleLoaded = () => {
        applyInitialSeekAndPlay();
      };
      video.addEventListener("loadedmetadata", handleLoaded, { once: true });
      return () => {
        video.removeEventListener("loadedmetadata", handleLoaded);
      };
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hls.loadSource(effectiveSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        applyInitialSeekAndPlay();
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !useProxy) {
            // Automatically retry through backend CORS/M3U8 proxy
            hls?.destroy();
            setUseProxy(true);
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls?.recoverMediaError();
          } else {
            onError?.();
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = effectiveSrc;
      const handleNativeLoaded = () => {
        applyInitialSeekAndPlay();
      };
      video.addEventListener("loadedmetadata", handleNativeLoaded, {
        once: true,
      });
      return () => {
        video.removeEventListener("loadedmetadata", handleNativeLoaded);
      };
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, useProxy]);

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      playsInline
      onTimeUpdate={(e) => {
        const vid = e.currentTarget;
        if (vid.currentTime > 0) {
          onTimeUpdateRef.current?.(vid.currentTime, vid.duration || 0);
        }
      }}
      className="w-full h-full object-contain bg-black outline-none focus:outline-none"
      tabIndex={0}
    />
  );
}
