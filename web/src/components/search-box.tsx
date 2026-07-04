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
    <div ref={containerRef} className="relative mx-4 max-w-md flex-1">
      <form action="/search" method="get" className="flex items-center">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Search"
          aria-label="Search videos"
          autoComplete="off"
          className="w-full rounded-l-full border border-black/15 border-r-0 px-4 py-1.5 text-sm dark:border-white/15 dark:bg-transparent"
        />
        <button
          type="submit"
          aria-label="Search"
          className="rounded-r-full border border-black/15 border-l-0 bg-black/5 px-4 py-[9px] dark:border-white/15 dark:bg-white/10"
        >
          <SearchIcon className="h-4 w-4" />
        </button>
      </form>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-black/10 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-neutral-900">
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
