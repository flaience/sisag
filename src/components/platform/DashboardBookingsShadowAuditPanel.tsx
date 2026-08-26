import { AlertTriangle, CheckCircle2, GitCompareArrows } from "lucide-react";

import type { DashboardBookingsShadowAuditService } from "@/modules/dashboard/Dashboard.bookings-shadow-audit";

type Data = Awaited<ReturnType<typeof DashboardBookingsShadowAuditService.observe>>;

type Props = {
  companyId: string;
  data: Data | null;
  error?: string | null;
};

function metric(label: string, legacy: number, bookings: number) {
  const matched = legacy === bookings;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div><span className="text-xs text-slate-500">Atual</span><p className="text-xl font-semibold text-slate-900">{legacy}</p></div>
        <div className="text-right"><span className="text-xs text-slate-500">Bookings</span><p className="text-xl font-semibold text-slate-900">{bookings}</p></div>
      </div>
      <p className={matched ? "mt-2 text-xs font-medium text-emerald-700" : "mt-2 text-xs font-medium text-rose-700"}>
        {matched ? "Compatível" : "Diferença encontrada"}
      </p>
    </div>
  );
}

export function DashboardBookingsShadowAuditPanel({ companyId, data, error }: Props) {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Validação da nova fonte do dashboard">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Controle de migração</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Validação da agenda no dashboard</h2>
          {data ? (
            <span className={data.matched ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700" : "rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"}>
              {data.matched ? "Fontes compatíveis" : "Divergências encontradas"}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-500">Empresa analisada: {companyId || "selecione uma empresa"}</p>
      </div>

      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}

      {!data && !error ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          Informe a empresa para iniciar uma comparação somente de leitura.
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metric("Hoje", data.legacy.today.total, data.bookings.today.total)}
            {metric("Esta semana", data.legacy.week.total, data.bookings.week.total)}
            {metric("Confirmados hoje", data.legacy.today.confirmed, data.bookings.today.confirmed)}
            {metric("Próximos", data.legacy.upcoming.length, data.bookings.upcoming.length)}
          </div>

          <div className={data.matched ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" : "rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"}>
            <div className="flex gap-2">
              {data.matched ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
              <div><p className="font-semibold">Orientação</p><p className="mt-1">{data.matched ? "A amostra está compatível. Continue observando antes de preparar um corte reversível." : "Mantenha a fonte atual e investigue as diferenças antes de qualquer corte."}</p></div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2"><GitCompareArrows className="h-4 w-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-800">Diferenças observadas</h3></div>
            {data.differences.length ? (
              <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Indicador</th><th className="px-3 py-2">Atual</th><th className="px-3 py-2">Bookings</th></tr></thead><tbody>{data.differences.map((difference) => <tr key={difference.field} className="border-t border-slate-100"><td className="px-3 py-2 font-medium text-slate-800">{difference.field}</td><td className="px-3 py-2 text-slate-600">{JSON.stringify(difference.legacy)}</td><td className="px-3 py-2 text-slate-600">{JSON.stringify(difference.bookings)}</td></tr>)}</tbody></table></div>
            ) : <p className="mt-2 text-sm text-emerald-700">Nenhuma diferença encontrada nesta observação.</p>}
          </div>
          <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">Observado em {new Date(data.recordedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
        </>
      ) : null}
    </section>
  );
}
