"use client";

import { Button } from "@/components/ui/button";
import { JourneySuggestedCommunication } from "./types";

type Props = {
  items: JourneySuggestedCommunication[];
  sendingSuggestedId: string | null;
  onOpenWhatsApp: (message: string) => void;
  onSend: (item: JourneySuggestedCommunication) => void;
  onCopy: (message: string) => void;
};

function getSuggestedCommunicationClasses(
  tone: JourneySuggestedCommunication["tone"],
) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

export function JourneySuggestedCommunicationsPanel({
  items,
  sendingSuggestedId,
  onOpenWhatsApp,
  onSend,
  onCopy,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        Não há sugestões de comunicação para este momento da jornada.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-2xl border p-4 ${getSuggestedCommunicationClasses(
            item.tone,
          )}`}
        >
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-sm opacity-80">{item.description}</p>
            </div>

            <div className="rounded-xl border border-white/60 bg-white/60 p-3 text-sm whitespace-pre-wrap">
              {item.message}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenWhatsApp(item.message)}
              >
                Abrir no WhatsApp
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onSend(item)}
                disabled={sendingSuggestedId === item.id}
              >
                {sendingSuggestedId === item.id
                  ? "Enviando..."
                  : "Enviar pelo SISAG"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(item.message)}
              >
                Copiar texto
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
