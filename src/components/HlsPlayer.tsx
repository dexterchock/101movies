import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface HlsPlayerProps {
  src: string;
  onError?: () => void;
}

export function HlsPlayer({ src, onError }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useProxy, setUseProxy] = useState(false);

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
    const isMp4 = src.toLowerCase().includes(".mp4") && !src.toLowerCase().includes(".m3u8");

    if (isMp4) {
      video.src = effectiveSrc;
      video.play().catch(() => {});
      return;
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hls.loadSource(effectiveSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // Auto-play might require user gesture
        });
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
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
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
      className="w-full h-full object-contain bg-black outline-none focus:outline-none"
      tabIndex={0}
    />
  );
}
