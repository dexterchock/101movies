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
        "group relative flex-shrink-0 rounded-lg overflow-hidden transition-all duration-300 outline-none",
        "focus:ring-4 focus:ring-white focus:scale-105 focus:z-10",
        "hover:scale-105 hover:z-10",
        className
      )}
    >
      <div className="w-full h-full bg-white/5 relative">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
        />
        {/* Using a solid gradient overlay instead of blur for TV GPU performance */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-focus:opacity-100 group-hover:opacity-100 transition-opacity duration-300" />
        
        {rank && (
          <div className="absolute top-2 left-2 bg-white text-black font-extrabold text-2xl px-3 py-1 rounded shadow-lg z-10">
            {rank}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 group-focus:translate-y-0 group-hover:translate-y-0 opacity-0 group-focus:opacity-100 group-hover:opacity-100 transition-all duration-300">
          <h3 className="text-white font-medium text-lg leading-tight line-clamp-2">{title}</h3>
          <p className="text-gray-300 text-sm mt-1">{item.release_date || item.first_air_date?.substring(0,4)}</p>
        </div>
      </div>
    </Link>
  );
}
