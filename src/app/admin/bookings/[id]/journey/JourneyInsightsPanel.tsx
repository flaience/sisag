//src/app/admin/bookings/[id]/journey/JourneyInsightsPanel.tsx
"use client";

import type { JourneyInsight } from "./types";

type Props = {
  items: JourneyInsight[];
};
//JourneyInsight

function getInsightClasses(tone: JourneyInsight["tone"]) {
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

export function JourneyInsightsPanel({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        Nenhum insight automático relevante detectado neste momento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-2xl border p-4 ${getInsightClasses(item.tone)}`}
        >
          <p className="text-sm font-semibold">{item.title}</p>
          <p className="mt-1 text-sm opacity-80">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
