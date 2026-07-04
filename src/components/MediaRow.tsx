import { MediaItem } from "../types";
import { MediaCard } from "./MediaCard";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
}

export function MediaRow({ title, items }: MediaRowProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="py-6 flex flex-col gap-4">
      <h2 className="text-3xl font-semibold px-12 text-white/90 tracking-wide">{title}</h2>
      {/* Horizontal scrolling row optimized for TV spatial nav */}
      <div className="flex gap-6 overflow-x-auto px-12 pb-8 pt-4 no-scrollbar snap-x">
        {items.map((item) => (
          <MediaCard 
            key={item.id} 
            item={item} 
            className="w-48 sm:w-56 md:w-64 aspect-[2/3] snap-start" 
          />
        ))}
      </div>
    </div>
  );
}
