"use client";

import { useState, useEffect } from "react";

export function SearchSelect({
  label,
  placeholder,
  fetchUrl,
  onSelect,
}: {
  label: string;
  placeholder?: string;
  fetchUrl: string; // ex: /api/v1/professionals/search?q=
  onSelect: (item: any) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // debounce
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      setLoading(true);

      const res = await fetch(`${fetchUrl}${encodeURIComponent(query)}`);
      const data = await res.json();

      setResults(data);
      setLoading(false);
      setOpen(true);
    }, 350);

    return () => clearTimeout(delay);
  }, [query]);

  function handleSelect(item: any) {
    setQuery(item.name);
    setOpen(false);
    onSelect(item);
  }

  return (
    <div className="w-full relative">
      <label className="block text-sm font-medium mb-1">{label}</label>

      <input
        className="border rounded px-3 py-2 w-full"
        placeholder={placeholder ?? "Buscar..."}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && (
        <div className="absolute right-3 top-9 text-sm text-gray-500">...</div>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded shadow max-h-48 overflow-y-auto mt-1">
          {results.map((item) => (
            <div
              key={item.id}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelect(item)}
            >
              {item.name}
            </div>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && (
        <div className="absolute z-10 w-full bg-white border rounded shadow p-2 text-gray-500 text-sm">
          Nenhum resultado
        </div>
      )}
    </div>
  );
}
