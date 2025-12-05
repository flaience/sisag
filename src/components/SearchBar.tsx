"use client";

import { useState } from "react";

export function SearchBar({ onSearch }: { onSearch: (text: string) => void }) {
  const [text, setText] = useState("");

  function handleSubmit(e: any) {
    e.preventDefault();
    onSearch(text);
  }

  function handleClear() {
    setText("");
    onSearch("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        placeholder="Pesquisar..."
        className="border rounded px-3 py-2 flex-1"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button type="submit" className="bg-blue-600 text-white px-4 rounded">
        Buscar
      </button>

      {text.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="bg-gray-300 px-3 rounded"
        >
          Limpar
        </button>
      )}
    </form>
  );
}
