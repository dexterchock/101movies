import { useState } from "react";
import { MediaItem } from "../types";
import { MediaCard } from "./MediaCard";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  rows?: 1 | 2;
  onClear?: () => void;
}

export function MediaRow({ title, items, rows = 1, onClear }: MediaRowProps) {
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
    <div className="flex flex-col w-full relative z-20">
      <div className={`flex items-center justify-between px-4 md:px-6 w-full mb-4 ${rows > 1 ? 'sticky top-0 z-50 pt-4 md:pt-6 pb-2 pointer-events-none' : 'pt-4 md:pt-6'}`}>
        {rows > 1 && (
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black from-40% via-black/80 to-transparent -z-10" />
        )}
        <h2 className={`text-2xl font-bold text-white/95 tracking-wide ${rows > 1 ? 'pointer-events-auto' : ''}`}>{title}</h2>
        <div className={`flex items-center gap-4 ${rows > 1 ? 'pointer-events-auto' : ''}`}>
          <div className="flex gap-2 items-center">
            {onClear && (
              <button
                onClick={onClear}
                className="mr-2 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-transparent hover:bg-white/10 rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                title="Clear History"
              >
                <Trash2 size={16} />
                Clear
              </button>
            )}
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
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8 px-4 md:px-6 w-full"
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
