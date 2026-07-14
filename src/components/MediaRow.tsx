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

  const renderHeader = (isSticky: boolean) => (
    <div 
      className={`relative flex items-center justify-between w-full px-6 md:px-8 pt-6 md:pt-8 pb-1 mb-2 ${
        isSticky ? 'sticky top-0 z-50 pointer-events-none' : ''
      }`}
    >
      {isSticky && (
        <div className="absolute inset-x-0 -top-4 h-32 md:h-40 bg-gradient-to-b from-black via-black/40 to-transparent -z-10 pointer-events-none" />
      )}
      <h2 className="relative z-10 text-2xl font-bold text-white/95 tracking-wide pointer-events-auto">{title}</h2>
      <div className="relative z-10 flex items-center gap-4 pointer-events-auto">
        <div className="flex gap-2 items-center">
          {onClear && (
            <button
              onClick={onClear}
              className="group mr-2 flex items-center justify-center px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-transparent hover:bg-white/10 rounded-full border border-white/10 hover:border-white/20 transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:outline-none select-none"
              title="Clear History"
            >
              <div className="flex items-center gap-2 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 will-change-transform transform-gpu backface-visibility-hidden [backface-visibility:hidden]">
                <Trash2 size={16} />
                Clear
              </div>
            </button>
          )}
          <button
            onClick={prevPage}
            disabled={!showLeft}
            className={`group p-2 rounded-full border border-white/20 transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none ${showLeft ? 'bg-white/10 hover:bg-white/20 cursor-pointer text-white' : 'bg-transparent text-white/30 cursor-default'}`}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-6 h-6 text-white transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 will-change-transform transform-gpu backface-visibility-hidden [backface-visibility:hidden]" />
          </button>
          <button
            onClick={nextPage}
            disabled={!showRight}
            className={`group p-2 rounded-full border border-white/20 transition-colors duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus:outline-none focus-visible:outline-none select-none ${showRight ? 'bg-white/10 hover:bg-white/20 cursor-pointer text-white' : 'bg-transparent text-white/30 cursor-default'}`}
            aria-label="Next page"
          >
            <ChevronRight className="w-6 h-6 text-white transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110 will-change-transform transform-gpu backface-visibility-hidden [backface-visibility:hidden]" />
          </button>
        </div>
      </div>
    </div>
  );

  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col w-full relative z-20">
      {rows === 2 ? (
        <>
          <div className="absolute top-0 left-0 right-0 bottom-[25%] pointer-events-none z-40">
            {renderHeader(true)}
          </div>
          <div className="flex items-center justify-between w-full px-6 md:px-8 pt-6 md:pt-8 pb-1 mb-2 invisible pointer-events-none" aria-hidden="true">
            <h2 className="text-2xl font-bold tracking-wide">{title}</h2>
            <div className="flex gap-4">
              <div className="flex gap-2 items-center">
                {onClear && (
                  <div className="mr-2 px-4 py-2 text-sm font-medium border rounded-full">
                    Clear
                  </div>
                )}
                <div className="w-[42px] h-[42px]" />
                <div className="w-[42px] h-[42px]" />
              </div>
            </div>
          </div>
        </>
      ) : (
        renderHeader(false)
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 md:gap-8 px-6 md:px-8 w-full relative z-10">
        {visibleItems.map((item) => (
          <MediaCard key={item.id} item={item} className="w-full" />
        ))}
      </div>
    </div>
  );
}
