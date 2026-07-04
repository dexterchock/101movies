import React from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { cn } from "../utils";

interface MediaCardProps {
  key?: React.Key | number | string;
  item: MediaItem;
  rank?: number;
  className?: string;
}

export function MediaCard({ item, rank, className }: MediaCardProps) {
  const title = item.title || item.name;
  const imageUrl = item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : "https://via.placeholder.com/500x750/111111/ffffff?text=No+Poster";
  const type = item.media_type || (item.title ? 'movie' : 'tv');

  return (
    <Link
      to={`/player/${type}/${item.id}`}
      tabIndex={0}
      className={cn(
        "group flex flex-col gap-3 flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] outline-none",
        "focus:scale-105 focus:z-10",
        "hover:scale-105 hover:z-10",
        className
      )}
    >
      <div className="w-full relative aspect-[2/3] rounded-xl overflow-hidden bg-[#111] border border-white/5 group-focus:ring-4 group-focus:ring-white group-focus:border-transparent transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-50" />
        
        {rank && (
          <div className="absolute top-2 left-2 bg-white/90 text-black font-extrabold text-xl px-3 py-1 rounded shadow-lg z-10 backdrop-blur-sm border border-white/20">
            {rank}
          </div>
        )}
      </div>
      
      <div className="flex flex-col px-1">
        <h3 className="text-white font-medium text-base leading-tight truncate group-focus:text-white transition-colors">
          {title}
        </h3>
        <p className="text-gray-400 text-sm mt-0.5 font-light">
          {item.release_date?.substring(0,4) || item.first_air_date?.substring(0,4)}
        </p>
      </div>
    </Link>
  );
}
