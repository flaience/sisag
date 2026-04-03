"use client";

type JourneyScoreBreakdownItem = {
  label: string;
  impact: number;
  status: "positive" | "neutral" | "negative";
  description: string;
};

type Props = {
  items: JourneyScoreBreakdownItem[];
};

function getJourneyBreakdownClasses(
  status: JourneyScoreBreakdownItem["status"],
) {
  switch (status) {
    case "positive":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "negative":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

export function JourneyScoreBreakdownPanel({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        Não há itens de composição da nota.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-2xl border p-4 ${getJourneyBreakdownClasses(
            item.status,
          )}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="mt-1 text-sm opacity-80">{item.description}</p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold">
                {item.impact === 0
                  ? "0"
                  : item.impact > 0
                    ? `+${item.impact}`
                    : item.impact}
              </p>
              <p className="text-xs opacity-70">impacto</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
