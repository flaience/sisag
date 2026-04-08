"use client";

import { Button } from "@/components/ui/button";
import type { JourneyHealthItem } from "./types";

function getJourneyHealthClasses(status: JourneyHealthItem["status"]) {
  switch (status) {
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "attention":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "critical":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

function getJourneyHealthDotClasses(status: JourneyHealthItem["status"]) {
  switch (status) {
    case "ok":
      return "bg-emerald-500";
    case "attention":
      return "bg-amber-500";
    case "critical":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

function getJourneyHealthBadge(
  status: JourneyHealthItem["status"],
  index: number,
) {
  if (index !== 0) return null;

  if (status === "critical") return "Foco crítico";
  if (status === "attention") return "Atenção principal";
  return "Ponto forte";
}

type Props = {
  items: JourneyHealthItem[];
  onAction: (item: JourneyHealthItem) => void;
};

export function JourneyHealthPanel({ items, onAction }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`rounded-2xl border p-4 ${getJourneyHealthClasses(
            item.status,
          )} ${index === 0 ? "ring-1 ring-black/5 shadow-sm" : ""}`}
        >
          <div className="flex items-start gap-3">
            <div className="pt-1">
              <span
                className={`block h-3 w-3 rounded-full ${getJourneyHealthDotClasses(
                  item.status,
                )}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  {item.label}
                </p>

                {getJourneyHealthBadge(item.status, index) ? (
                  <span className="rounded-full border border-black/10 bg-white/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {getJourneyHealthBadge(item.status, index)}
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-lg font-semibold">{item.title}</p>

              <p className="mt-2 text-sm opacity-80">{item.description}</p>

              {item.actionLabel && item.actionType ? (
                <div className="mt-4">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onAction(item)}
                  >
                    {item.actionLabel}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
