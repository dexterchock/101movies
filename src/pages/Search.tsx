import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { MediaItem } from "../types";
import { MediaCard } from "../components/MediaCard";
import { Search as SearchIcon } from "lucide-react";

export function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length > 2) {
      const timer = setTimeout(() => {
        api.search(query).then(setResults);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query]);

  // Auto-focus input for TV use
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col pt-12 px-12 min-h-full">
      <div className="relative mb-12 flex items-center max-w-2xl">
        <SearchIcon className="absolute left-6 text-gray-400" size={32} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, TV shows..."
          className="w-full bg-white/10 text-white text-2xl pl-20 pr-8 py-6 rounded-2xl outline-none focus:ring-4 focus:ring-white focus:bg-white/20 transition-all placeholder:text-gray-500"
          tabIndex={0}
        />
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-24">
          {results.map((item) => (
            <MediaCard key={item.id} item={item} className="aspect-[2/3]" />
          ))}
        </div>
      ) : query.trim().length > 2 ? (
        <div className="text-gray-500 text-2xl mt-12 text-center">No results found for "{query}"</div>
      ) : null}
    </div>
  );
}
