import { useRef, useState, useEffect } from "react";
import { MediaItem } from "../types";
import { MediaCard } from "./MediaCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  rows?: 1 | 2;
}

export function MediaRow({ title, items, rows = 1 }: MediaRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const handleScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeft(scrollLeft > 20);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener("resize", handleScroll);
    return () => window.removeEventListener("resize", handleScroll);
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const clientWidth = rowRef.current.clientWidth;
      const scrollAmount = direction === "left" ? -clientWidth : clientWidth;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="py-4 flex flex-col gap-6 relative group/row z-20">
      <h2 className="text-2xl font-bold px-12 md:px-16 text-white/95 tracking-wide">{title}</h2>
      
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          tabIndex={-1}
          className={`absolute left-0 top-0 bottom-12 z-30 w-24 bg-gradient-to-r from-black via-black/80 to-transparent flex items-center justify-start pl-4 md:pl-8 text-white transition-all duration-500 ${showLeft ? 'opacity-0 group-hover/row:opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
          aria-hidden="true"
        >
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 hover:bg-white/20 hover:scale-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]">
            <ChevronLeft size={32} />
          </div>
        </button>

        {/* Horizontal scrolling row */}
        <div 
          ref={rowRef}
          onScroll={handleScroll}
          className={`overflow-x-auto px-12 md:px-16 scroll-pl-12 md:scroll-pl-16 scroll-pr-12 md:scroll-pr-16 pb-12 pt-4 no-scrollbar snap-x snap-mandatory scroll-smooth relative z-20 gap-6 md:gap-8 ${rows === 1 ? 'flex' : 'grid grid-rows-2 grid-flow-col auto-cols-max'}`}
        >
          {items.map((item) => (
            <MediaCard 
              key={item.id} 
              item={item} 
              className="w-36 sm:w-44 md:w-56 snap-start" 
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          tabIndex={-1}
          className={`absolute right-0 top-0 bottom-12 z-30 w-24 bg-gradient-to-l from-black via-black/80 to-transparent flex items-center justify-end pr-4 md:pr-8 text-white transition-all duration-500 ${showRight ? 'opacity-0 group-hover/row:opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
          aria-hidden="true"
        >
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 hover:bg-white/20 hover:scale-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]">
            <ChevronRight size={32} />
          </div>
        </button>
      </div>
    </div>
  );
}
