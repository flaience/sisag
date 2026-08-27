import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
} from "lucide-react";

export type SchedulingSummary = {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
};

type Props = { summary: SchedulingSummary };

const cards = [
  { key: "total", label: "No período", icon: CalendarDays, tone: "bg-slate-100 text-slate-700" },
  { key: "pending", label: "Pendentes", icon: CalendarClock, tone: "bg-amber-50 text-amber-700" },
  { key: "confirmed", label: "Confirmados", icon: CalendarCheck2, tone: "bg-blue-50 text-blue-700" },
  { key: "completed", label: "Concluídos", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  { key: "cancelled", label: "Cancelados", icon: CalendarX2, tone: "bg-rose-50 text-rose-700" },
] as const;

export function SchedulingSummaryCards({ summary }: Props) {
  return (
    <section aria-label="Resumo dos agendamentos" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map(({ key, label, icon: Icon, tone }) => (
        <article key={key} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{summary[key]}</p>
            </div>
            <span className={`rounded-xl p-2.5 ${tone}`} aria-hidden="true"><Icon className="h-5 w-5" /></span>
          </div>
        </article>
      ))}
    </section>
  );
}
