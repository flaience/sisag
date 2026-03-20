//src/app/admin/agenda/page.tsx
import { redirect } from "next/navigation";

import { AgendaTimeGrid } from "@/components/agenda/AgendaTimeGrid";
import { AgendaDayHeader } from "@/components/agenda/AgendaDayHeader";
import { AgendaFilters } from "@/components/agenda/AgendaFilters";
import { AgendaStatsRow } from "@/components/agenda/AgendaStatsRow";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { AgendaService } from "@/modules/agenda/Agenda.service";
import { getCurrentCompany } from "@/modules/dashboard/getCurrentCompany";

type PageProps = {
  searchParams?: Promise<{
    date?: string;
    professionalId?: string;
    status?: string;
  }>;
};

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AgendaPage({ searchParams }: PageProps) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const company = await getCurrentCompany();

  if (!company) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Agenda do SISAG
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Usuário autenticado, mas sem empresa vinculada.
          </p>
        </header>

        <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          Verifique o vínculo do usuário em <code>profiles.companyId</code>.
        </div>
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const dateIso = resolvedSearchParams?.date || getTodayIso();
  const professionalId = resolvedSearchParams?.professionalId || undefined;
  const status = resolvedSearchParams?.status || "ALL";

  const agenda = await AgendaService.getDayAgenda(company.id, {
    dateIso,
    professionalId,
    status: status as
      | "ALL"
      | "PENDING"
      | "CONFIRMED"
      | "CANCELLED"
      | "COMPLETED"
      | "RESCHEDULED",
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AgendaDayHeader dateIso={dateIso} />
      <AgendaFilters
        dateIso={dateIso}
        selectedProfessionalId={agenda.appliedFilters.professionalId}
        selectedStatus={agenda.appliedFilters.status}
        professionals={agenda.availableProfessionals}
      />
      <AgendaStatsRow stats={agenda.stats} />
      <AgendaTimeGrid columns={agenda.board} />
    </div>
  );
}
