"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { useClickOutside } from "@/lib/use-click-outside";

export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useClickOutside(containerRef, () => setIsOpen(false));

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!value.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(value)}`,
      );
      if (!res.ok) {
        return;
      }
      const titles: string[] = await res.json();
      setSuggestions(titles);
      setIsOpen(titles.length > 0);
    }, 250);
  }

  function selectSuggestion(title: string) {
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(title)}`);
  }

  return (
    <div
      ref={containerRef}
      className="relative mx-1 min-w-0 max-w-md flex-1 sm:mx-4"
    >
      <form
        action="/search"
        method="get"
        className="relative flex items-center"
      >
        <SearchIcon className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Search"
          aria-label="Search videos"
          autoComplete="off"
          className="w-full min-w-0 rounded border border-white/20 bg-black/40 py-1.5 pr-3 pl-9 text-sm transition-colors duration-200 placeholder:text-muted-foreground focus:border-white focus:bg-black/70 focus:outline-none"
        />
      </form>

      {isOpen && suggestions.length > 0 && (
        <div className="glass absolute z-50 mt-2 w-full animate-scale-in rounded-lg py-1 shadow-modal">
          {suggestions.map((title) => (
            <button
              key={title}
              type="button"
              onClick={() => selectSuggestion(title)}
              className="block w-full truncate px-4 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              {title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
