"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScheduleSlotPicker } from "@/components/ScheduleSlotPicker";

// ======================================================================
// COMPONENTE UNIVERSAL DE BUSCA
// ======================================================================
export function SearchSelect({
  label,
  fetchUrl,
  placeholder = "Digite para buscar...",
  onSelect,
}: {
  label: string;
  fetchUrl: string;
  placeholder?: string;
  onSelect: (item: any) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
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
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  return (
    <div className="w-full relative">
      <label className="block text-sm font-medium mb-1">{label}</label>

      <input
        className="border rounded px-3 py-2 w-full"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
      />

      {open && results.length > 0 && (
        <div className="absolute z-20 w-full bg-white border rounded shadow max-h-52 overflow-y-auto mt-1">
          {results.map((item) => (
            <div
              key={item.id}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50"
              onClick={() => {
                setQuery(item.name);
                onSelect(item);
                setOpen(false);
              }}
            >
              <div className="font-medium">{item.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ======================================================================
// PAGINA PRINCIPAL
// ======================================================================
export default function AppointmentNewPage() {
  const [professional, setProfessional] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [scheduledTime, setScheduledTime] = useState(""); // FULL ISO
  const router = useRouter();

  async function handleSubmit(e: any) {
    e.preventDefault();

    if (!professional || !client || !scheduledTime) {
      alert("Preencha todos os campos.");
      return;
    }

    const res = await fetch("/api/v1/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId: professional.id,
        clientId: client.id,
        scheduledTime,
      }),
    });

    if (res.ok) {
      router.push("/admin/appointments");
    } else {
      alert("Erro ao criar agendamento");
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Novo Agendamento</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* -------------------------- */}
        {/* BUSCAR PROFISSIONAL       */}
        {/* -------------------------- */}
        <SearchSelect
          label="Profissional"
          fetchUrl="/api/v1/professionals/search?q="
          onSelect={(p) => {
            setProfessional(p);
            setScheduledTime("");
          }}
        />

        {/* -------------------------- */}
        {/* BUSCAR CLIENTE            */}
        {/* -------------------------- */}
        <SearchSelect
          label="Cliente"
          fetchUrl="/api/v1/people/search?q="
          onSelect={(c) => setClient(c)}
        />

        {/* -------------------------- */}
        {/* DATA                       */}
        {/* -------------------------- */}
        <div>
          <label className="block text-sm font-medium mb-1">Data</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setScheduledTime("");
            }}
          />
        </div>

        {/* -------------------------- */}
        {/* HORÁRIOS DISPONÍVEIS      */}
        {/* -------------------------- */}
        {professional && date && (
          <ScheduleSlotPicker
            professionalId={professional.id}
            date={date}
            onSelect={(fullTime) => {
              setScheduledTime(fullTime); // ISO completo
            }}
          />
        )}

        {/* -------------------------- */}
        {/* BOTÃO SALVAR              */}
        {/* -------------------------- */}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
