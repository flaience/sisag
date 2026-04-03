//src/app/admin/bookings/[id]/journey/JourneyHealthPanel.tsx
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

type Props = {
  items: JourneyHealthItem[];
  onAction: (item: JourneyHealthItem) => void;
};

export function JourneyHealthPanel({ items, onAction }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-2xl border p-4 ${getJourneyHealthClasses(
            item.status,
          )}`}
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
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {item.label}
              </p>

              <p className="mt-2 text-lg font-semibold">{item.title}</p>

              <p className="mt-2 text-sm opacity-80">{item.description}</p>

              {item.actionLabel && item.actionType && (
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
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
