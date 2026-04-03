// src/app/admin/bookings/[id]/journey/JourneyQuickSignals.tsx
"use client";

import type { BookingQuickSignal } from "./types";

function getQuickSignalClasses(tone?: BookingQuickSignal["tone"]) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

type Props = {
  signals: BookingQuickSignal[];
  onSignalClick: (signal: BookingQuickSignal) => void;
};

export function JourneyQuickSignals({ signals, onSignalClick }: Props) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {signals.map((signal) => {
        const Icon = signal.icon;
        const clickable = Boolean(signal.actionType);

        return (
          <button
            key={`${signal.label}-${signal.value}`}
            type="button"
            onClick={() => clickable && onSignalClick(signal)}
            disabled={!clickable}
            className={`rounded-2xl border p-4 text-left transition ${getQuickSignalClasses(signal.tone)} ${
              clickable ? "hover:shadow-sm" : "cursor-default"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/70 p-2">
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide opacity-80">
                  {signal.label}
                </p>
                <p className="mt-1 text-sm font-semibold">{signal.value}</p>
                {signal.helper ? (
                  <p className="mt-1 text-xs opacity-80">{signal.helper}</p>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}