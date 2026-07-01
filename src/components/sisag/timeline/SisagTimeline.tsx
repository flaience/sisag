import { ReactNode } from "react";
import { SisagEmptyState } from "../feedback/SisagEmptyState";

export type SisagTimelineItem = {
  id: string;
  title: string;
  description?: string | null;
  meta?: string | null;
  icon?: ReactNode;
};

type SisagTimelineProps = {
  items: SisagTimelineItem[];
  emptyMessage?: string;
};

export function SisagTimeline({
  items,
  emptyMessage = "Nenhuma atividade registrada.",
}: SisagTimelineProps) {
  if (items.length === 0) {
    return (
      <SisagEmptyState
        title={emptyMessage}
        description="Assim que houver novos movimentos, eles aparecerão nesta linha do tempo."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          {item.icon && (
            <div className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-600">
              {item.icon}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <p className="font-medium text-slate-900">{item.title}</p>

              {item.meta && (
                <p className="shrink-0 text-xs text-slate-400">{item.meta}</p>
              )}
            </div>

            {item.description && (
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
