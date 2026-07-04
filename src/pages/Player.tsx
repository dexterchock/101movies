import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { MediaDetails, MediaItem } from "../types";
import { HlsPlayer } from "../components/HlsPlayer";

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

  useEffect(() => {
    if (type && id) {
      api.getDetails(type, id).then((data) => {
        setDetails(data);
        // Save to history
        try {
          const stored = localStorage.getItem("watch_history");
          let history: MediaItem[] = stored ? JSON.parse(stored) : [];
          // Remove if it exists
          history = history.filter((item) => item.id.toString() !== id);
          // Add to top
          history.unshift(data as MediaItem);
          // Keep only last 20
          localStorage.setItem("watch_history", JSON.stringify(history.slice(0, 20)));
        } catch (e) {}
      });
    }
  }, [type, id]);

  if (!details) {
    return <div className="p-12 text-2xl text-gray-500">Loading...</div>;
  }

  const title = details.title || details.name;

  return (
    <div className="flex flex-col min-h-full p-8 md:p-12 gap-8">
      {/* Video Player Section */}
      <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative group focus-within:ring-4 focus-within:ring-white/50">
        <HlsPlayer src={activeSource} />
      </div>

      {/* Line Selection */}
      <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-xl">
        <span className="text-gray-400 font-medium px-4">Streaming Source:</span>
        {MOCK_SOURCES.map((src, index) => (
          <button
            key={index}
            onClick={() => setActiveSource(src.url)}
            tabIndex={0}
            className={`px-6 py-3 rounded-lg font-medium transition-all outline-none focus:ring-4 focus:ring-white focus:scale-105 ${activeSource === src.url ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {src.name}
          </button>
        ))}
      </div>

      {/* Media Details */}
      <div className="flex flex-col md:flex-row gap-8 mt-4">
        {details.poster_path && (
          <img
            src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
            alt={title}
            className="w-48 md:w-64 rounded-xl shadow-lg shrink-0"
          />
        )}
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white">{title}</h1>
          <div className="flex flex-wrap gap-4 items-center text-gray-300">
            <span>{(details.release_date || details.first_air_date)?.substring(0, 4)}</span>
            {details.runtime && <span>{details.runtime} min</span>}
            <div className="flex gap-2">
              {details.genres?.map(g => (
                <span key={g.id} className="bg-white/10 px-2 py-1 rounded text-sm">{g.name}</span>
              ))}
            </div>
            {details.vote_average > 0 && (
              <span className="text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded">
                ★ {details.vote_average.toFixed(1)}
              </span>
            )}
          </div>
          {details.tagline && <p className="text-xl text-gray-400 italic">"{details.tagline}"</p>}
          <p className="text-gray-200 text-lg leading-relaxed max-w-4xl">{details.overview}</p>
        </div>
      </div>
    </div>
  );
}
