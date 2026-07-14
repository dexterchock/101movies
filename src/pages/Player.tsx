import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { MediaDetails, MediaItem } from "../types";
import { HlsPlayer } from "../components/HlsPlayer";
import { Play } from "lucide-react";

// Mock streaming sources representing different CDNs/Servers
const MOCK_SOURCES = [
  { name: "Line A (FHD)", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
  { name: "Line B (HD)", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
  { name: "Line C (SD)", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
];

export function Player() {
  const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [activeSource, setActiveSource] = useState(MOCK_SOURCES[0].url);
  const [isPlaying, setIsPlaying] = useState(false);
  const playButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (type && id) {
      api.getDetails(type, id).then((data) => {
        setDetails(data);
        try {
          const stored = localStorage.getItem("watch_history");
          let history: MediaItem[] = stored ? JSON.parse(stored) : [];
          history = history.filter((item) => item.id.toString() !== id);
          history.unshift(data as MediaItem);
          localStorage.setItem("watch_history", JSON.stringify(history.slice(0, 20)));
        } catch (e) {}
      });
    }
  }, [type, id]);

  useEffect(() => {
    if (details && !isPlaying) {
      playButtonRef.current?.focus();
    }
  }, [details, isPlaying]);

  if (!details) {
    return <div className="p-12 flex items-center justify-center min-h-screen"><div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div></div>;
  }

  const title = details.title || details.name;
  const backdropUrl = details.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
    : `https://image.tmdb.org/t/p/original${details.poster_path}`;

  return (
    <div className="flex flex-col min-h-full pb-24 relative">
      {/* Hero / Player Section */}
      <div className="w-full relative aspect-video bg-black overflow-hidden group">
        {isPlaying ? (
          <HlsPlayer src={activeSource} />
        ) : (
          <div className="absolute inset-0 w-full h-full">
            {backdropUrl && (
              <img 
                src={backdropUrl} 
                alt={title} 
                className="w-full h-full object-cover opacity-50"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
            
            {/* Play Overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-10 pt-32">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-2xl">{title}</h1>
              <div className="flex flex-wrap gap-4 items-center text-gray-200 mb-8 font-medium">
                <span className="bg-white/15 px-3 py-1 rounded-full border border-white/10">{(details.release_date || details.first_air_date)?.substring(0, 4)}</span>
                {details.runtime && <span className="bg-white/15 px-3 py-1 rounded-full border border-white/10">{details.runtime} min</span>}
                {details.vote_average > 0 && (
                  <span className="text-black font-bold bg-white px-3 py-1 rounded-full shadow-lg">
                    ★ {details.vote_average.toFixed(1)}
                  </span>
                )}
                {details.genres?.slice(0, 3).map(g => (
                  <span key={g.id} className="text-gray-300">{g.name}</span>
                ))}
              </div>
              <p className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-3xl mb-10 line-clamp-3 drop-shadow-md">
                {details.overview}
              </p>
              <div>
                <button
                  ref={playButtonRef}
                  onClick={() => setIsPlaying(true)}
                  tabIndex={0}
                  className="group flex items-center justify-center bg-white text-black px-10 py-4 rounded-full font-bold text-xl transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none hover:bg-gray-200 shadow-2xl"
                >
                  <div className="flex items-center gap-3 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 will-change-transform transform-gpu backface-visibility-hidden [backface-visibility:hidden]">
                    <Play size={28} className="fill-black" />
                    Play Now
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Streaming Sources Section */}
      <div className="px-8 md:px-16 mt-12 max-w-7xl mx-auto w-full">
        <h2 className="text-2xl font-semibold mb-6 text-white/90">Streaming Servers</h2>
        <div className="flex flex-wrap items-center gap-4">
          {MOCK_SOURCES.map((src, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveSource(src.url);
                setIsPlaying(true);
              }}
              tabIndex={0}
              className={`group px-8 py-4 rounded-2xl font-medium transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none border ${activeSource === src.url ? 'bg-white text-black border-white shadow-[0_4px_24px_rgba(255,255,255,0.2)]' : 'bg-[#111] text-white border-white/10 hover:bg-white/10'}`}
            >
              <div className="transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 will-change-transform transform-gpu backface-visibility-hidden [backface-visibility:hidden]">
                {src.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
