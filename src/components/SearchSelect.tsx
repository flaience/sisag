"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchItem = {
  id: string;
  name: string;
};

type SearchSelectProps = {
  label: string;
  placeholder?: string;
  fetchUrl: string;
  onSelect: (item: SearchItem) => void;
  selectedLabel?: string;
};

export function SearchSelect({
  label,
  placeholder,
  fetchUrl,
  onSelect,
  selectedLabel,
}: SearchSelectProps) {
  const [query, setQuery] = useState(selectedLabel ?? "");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(selectedLabel ?? "");
  }, [selectedLabel]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      setErrorMsg(null);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await fetch(`${fetchUrl}${encodeURIComponent(query)}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          setResults([]);
          setErrorMsg(data?.message ?? "Erro ao buscar resultados.");
          setOpen(true);
          return;
        }

        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch {
        setResults([]);
        setErrorMsg("Erro ao buscar resultados.");
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(delay);
  }, [query, fetchUrl]);

  function handleSelect(item: SearchItem) {
    setQuery(item.name);
    setOpen(false);
    setResults([]);
    onSelect(item);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <Label className="mb-2 block">{label}</Label>

      <Input
        placeholder={placeholder ?? "Buscar..."}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length > 0 || errorMsg) setOpen(true);
        }}
      />

      {loading && (
        <div className="absolute right-3 top-10 text-xs text-slate-500">
          Buscando...
        </div>
      )}

      {open && (
        <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {errorMsg ? (
            <div className="p-3 text-sm text-red-600">{errorMsg}</div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {item.name}
              </button>
            ))
          ) : !loading ? (
            <div className="p-3 text-sm text-slate-500">Nenhum resultado</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
