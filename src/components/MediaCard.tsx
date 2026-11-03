import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Star, Film, Tv } from "lucide-react";
import { MediaItem } from "../types";
import { cn } from "../utils";

interface MediaCardProps {
  key?: React.Key | number | string;
  item: MediaItem;
  rank?: number;
  className?: string;
}

export function MediaCard({ item, rank, className }: MediaCardProps) {
  const [imgError, setImgError] = useState(false);
  const title = item.title || item.name || "Untitled";
  const type = item.media_type === "tv" || (!item.media_type && !item.title && item.name) ? "tv" : "movie";
  const hasPoster = Boolean(item.poster_path) && !imgError;
  const imageUrl = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "";

  return (
    <Link
      to={`/player/${type}/${item.id}`}
      tabIndex={0}
      className={cn(
        "group flex flex-col gap-3 flex-shrink-0 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none focus:outline-none focus-visible:outline-none select-none cursor-pointer",
        "focus:z-30 hover:z-30",
        className
      )}
    >
      <div className="w-full relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#111] border border-white/10 group-focus:ring-4 group-focus:ring-white/80 group-focus:border-transparent group-hover:border-white/30 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-lg group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.8)]">
        {hasPoster ? (
          <img
            src={imageUrl}
            alt={title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transform group-hover:scale-110 group-focus:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu backface-hidden"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-5 text-center bg-neutral-900/90 transform group-hover:scale-110 group-focus:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform transform-gpu backface-hidden">
            {type === "tv" ? (
              <Tv className="w-10 h-10 text-neutral-600 mb-3" />
            ) : (
              <Film className="w-10 h-10 text-neutral-600 mb-3" />
            )}
            <span className="text-neutral-400 text-sm font-medium line-clamp-3 leading-snug">
              {title}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none" />
        
        {rank && (
          <div className="absolute top-3 left-3 bg-white text-black font-bold text-xs px-2.5 py-1 min-w-[24px] rounded-full shadow-lg z-10 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 flex items-center justify-center tabular-nums">
            <span>{rank}</span>
          </div>
        )}

        {item.vote_average ? (
          <div className="absolute bottom-3 right-3 bg-white text-black font-bold text-xs px-2.5 py-1 rounded-full shadow-lg z-10 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 flex items-center gap-1 tabular-nums">
            <Star className="w-3 h-3 text-black fill-black" />
            <span>{item.vote_average.toFixed(1)}</span>
          </div>
        ) : null}
      </div>
      
      <div className="flex flex-col px-1">
        <h3 className="text-white font-medium text-base leading-tight truncate group-focus:text-white transition-colors">
          {title}
        </h3>
        <p className="text-gray-400 text-sm mt-0.5 font-light">
          {(item.release_date || item.first_air_date)?.substring(0, 4) || (type === "tv" ? "TV Series" : "Movie")}
        </p>
      </div>
    </Link>
  );
}
