import { CalendarDays, Clock3, UserRound, Wrench } from "lucide-react";

type Props = {
  clientName?: string | null;
  professionalName?: string | null;
  serviceName?: string | null;
  date?: string | null;
  time?: string | null;
  durationMinutes?: number | null;
};

const itemClass = "flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 p-3";

export function SchedulingSelectionSummary({
  clientName,
  professionalName,
  serviceName,
  date,
  time,
  durationMinutes,
}: Props) {
  return (
    <aside aria-label="Resumo do agendamento" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <p className="font-semibold text-slate-950">Resumo do agendamento</p>
        <p className="mt-1 text-sm text-slate-500">Confira as escolhas antes de confirmar.</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <div className={itemClass}><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0"><p className="text-xs text-slate-500">Cliente</p><p className="truncate text-sm font-medium text-slate-800">{clientName || "Não selecionado"}</p></div></div>
        <div className={itemClass}><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0"><p className="text-xs text-slate-500">Profissional</p><p className="truncate text-sm font-medium text-slate-800">{professionalName || "Não selecionado"}</p></div></div>
        <div className={itemClass}><Wrench className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0"><p className="text-xs text-slate-500">Serviço</p><p className="truncate text-sm font-medium text-slate-800">{serviceName || "Não selecionado"}</p></div></div>
        <div className={itemClass}><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><p className="text-xs text-slate-500">Data</p><p className="text-sm font-medium text-slate-800">{date || "Não selecionada"}</p></div></div>
        <div className={itemClass}><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><p className="text-xs text-slate-500">Horário</p><p className="text-sm font-medium text-slate-800">{time || "Não selecionado"}</p></div></div>
        <div className={itemClass}><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><p className="text-xs text-slate-500">Duração</p><p className="text-sm font-medium text-slate-800">{durationMinutes ? `${durationMinutes} min` : "A definir"}</p></div></div>
      </div>
    </aside>
  );
}
