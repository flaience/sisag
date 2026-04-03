//src/app/admin/bookings/[id]/journey/JourneyOpportunitiesPanel.tsx

"use client";

import { Button } from "@/components/ui/button";

import type { JourneyOpportunity } from "./types";

type Props = {
  items: JourneyOpportunity[];
  onAction: (item: JourneyOpportunity) => void;
};

function getOpportunityClasses(tone: JourneyOpportunity["tone"]) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

export function JourneyOpportunitiesPanel({ items, onAction }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        Nenhuma oportunidade relevante detectada neste momento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-2xl border p-4 ${getOpportunityClasses(
            item.tone,
          )}`}
        >
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-sm opacity-80">{item.description}</p>
            </div>

            {item.actionLabel && item.actionType ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(item)}
              >
                {item.actionLabel}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
