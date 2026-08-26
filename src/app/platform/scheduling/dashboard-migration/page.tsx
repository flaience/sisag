import { DashboardBookingsShadowAuditPanel } from "@/components/platform/DashboardBookingsShadowAuditPanel";
import { DashboardBookingsShadowAuditService } from "@/modules/dashboard/Dashboard.bookings-shadow-audit";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function DashboardMigrationPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = Array.isArray(params.companyId) ? params.companyId[0] : params.companyId;
  const companyId = raw?.trim() ?? "";
  let data = null;
  let error: string | null = null;

  if (companyId && !uuid.test(companyId)) error = "Informe um identificador de empresa válido.";
  if (companyId && !error) {
    try { data = await DashboardBookingsShadowAuditService.observe(companyId); }
    catch (cause) { console.error("PLATFORM DASHBOARD MIGRATION ERROR:", cause); error = "Não foi possível comparar as fontes agora."; }
  }

  return <div className="space-y-6"><header><p className="text-sm font-medium text-blue-700">Controle interno Flaience</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">Migração da agenda</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Valide a nova fonte do dashboard antes de retirar a compatibilidade anterior.</p></header><form method="get" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"><label className="flex-1 text-xs font-medium text-slate-600">Identificador da empresa<input name="companyId" defaultValue={companyId} placeholder="UUID da empresa" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label><button className="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">Comparar fontes</button></form><DashboardBookingsShadowAuditPanel companyId={companyId} data={data} error={error} /></div>;
}
