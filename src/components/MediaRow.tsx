import { useRef, useState, useEffect } from "react";
import { MediaItem } from "../types";
import { MediaCard } from "./MediaCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
}

export function MediaRow({ title, items }: MediaRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const handleScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeft(scrollLeft > 20);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  useEffect(() => {
    handleScroll();
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const clientWidth = rowRef.current.clientWidth;
      const scrollAmount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="py-6 flex flex-col gap-4 relative group/row">
      <h2 className="text-2xl font-bold px-12 text-white/95 tracking-wide">{title}</h2>
      
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          tabIndex={-1}
          className={`absolute left-0 top-0 bottom-8 z-20 w-16 bg-gradient-to-r from-black/90 to-transparent flex items-center justify-start pl-4 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 disabled:opacity-0 ${!showLeft && 'hidden'}`}
          aria-hidden="true"
        >
          <div className="bg-black/50 p-2 rounded-full border border-white/10 hover:bg-white/20 hover:scale-110 transition-all duration-300">
            <ChevronLeft size={32} />
          </div>
        </button>

        {/* Horizontal scrolling row */}
        <div 
          ref={rowRef}
          onScroll={handleScroll}
          className="flex gap-5 overflow-x-auto px-12 pb-8 pt-4 no-scrollbar snap-x snap-mandatory"
        >
          {items.map((item) => (
            <MediaCard 
              key={item.id} 
              item={item} 
              className="w-40 sm:w-48 md:w-56 snap-start" 
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          tabIndex={-1}
          className={`absolute right-0 top-0 bottom-8 z-20 w-16 bg-gradient-to-l from-black/90 to-transparent flex items-center justify-end pr-4 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 disabled:opacity-0 ${!showRight && 'hidden'}`}
          aria-hidden="true"
        >
          <div className="bg-black/50 p-2 rounded-full border border-white/10 hover:bg-white/20 hover:scale-110 transition-all duration-300">
            <ChevronRight size={32} />
          </div>
        </button>
      </div>
    </div>
  );
}
