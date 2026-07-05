import { useState } from "react";
import { MediaItem } from "../types";
import { MediaCard } from "./MediaCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  rows?: 1 | 2;
}

export function MediaRow({ title, items, rows = 1 }: MediaRowProps) {
  const [page, setPage] = useState(0);

  const itemsPerPage = rows === 2 ? 12 : 6;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  const visibleItems = items.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const showLeft = page > 0;
  const showRight = page < totalPages - 1;

  const prevPage = () => {
    if (page > 0) setPage(page - 1);
  };

  const nextPage = () => {
    if (page < totalPages - 1) setPage(page + 1);
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col w-full py-8 relative z-20">
      <div className="flex items-center justify-between px-12 md:px-16 w-full mb-4">
        <h2 className="text-2xl font-bold text-white/95 tracking-wide">{title}</h2>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={prevPage}
              disabled={!showLeft}
              className={`p-2 rounded-full border border-white/20 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${showLeft ? 'bg-white/10 hover:bg-white/20 hover:scale-110 cursor-pointer text-white' : 'bg-transparent text-white/30 cursor-default'}`}
              aria-label="Previous page"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextPage}
              disabled={!showRight}
              className={`p-2 rounded-full border border-white/20 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${showRight ? 'bg-white/10 hover:bg-white/20 hover:scale-110 cursor-pointer text-white' : 'bg-transparent text-white/30 cursor-default'}`}
              aria-label="Next page"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div 
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8 px-12 md:px-16 w-full"
      >
        {visibleItems.map((item) => (
          <MediaCard 
            key={item.id} 
            item={item} 
            className="w-full" 
          />
        ))}
      </div>
    </div>
  );
}
