import Link from "next/link";
import { Funnel, RotateCcw } from "lucide-react";
import type {
  AgendaFilterProfessionalOption,
  AgendaStatusFilter,
} from "@/modules/agenda/Agenda.types";

type Props = {
  dateIso: string;
  selectedProfessionalId: string | null;
  selectedStatus: AgendaStatusFilter;
  professionals: AgendaFilterProfessionalOption[];
};

const statusOptions: Array<{ value: AgendaStatusFilter; label: string }> = [
  { value: "ALL", label: "Todos os status" },
  { value: "PENDING", label: "Pendentes" },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "CANCELLED", label: "Cancelados" },
  { value: "COMPLETED", label: "Concluídos" },
  { value: "RESCHEDULED", label: "Reagendados" },
];

function buildHref(params: {
  dateIso: string;
  professionalId?: string | null;
  status?: AgendaStatusFilter;
}) {
  const search = new URLSearchParams();
  search.set("date", params.dateIso);

  if (params.professionalId) {
    search.set("professionalId", params.professionalId);
  }

  if (params.status && params.status !== "ALL") {
    search.set("status", params.status);
  }

  return `/admin/agenda?${search.toString()}`;
}

export function AgendaFilters({
  dateIso,
  selectedProfessionalId,
  selectedStatus,
  professionals,
}: Props) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Funnel className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold sm:text-base">Filtros</h2>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Profissional
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref({
                  dateIso,
                  professionalId: null,
                  status: selectedStatus,
                })}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  !selectedProfessionalId ? "bg-muted" : "hover:bg-muted/40"
                }`}
              >
                Todos
              </Link>

              {professionals.map((professional) => (
                <Link
                  key={professional.id}
                  href={buildHref({
                    dateIso,
                    professionalId: professional.id,
                    status: selectedStatus,
                  })}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    selectedProfessionalId === professional.id
                      ? "bg-muted"
                      : "hover:bg-muted/40"
                  }`}
                >
                  {professional.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <Link
                  key={status.value}
                  href={buildHref({
                    dateIso,
                    professionalId: selectedProfessionalId,
                    status: status.value,
                  })}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    selectedStatus === status.value
                      ? "bg-muted"
                      : "hover:bg-muted/40"
                  }`}
                >
                  {status.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <Link
            href={`/admin/agenda?date=${dateIso}`}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-muted/40"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar filtros
          </Link>
        </div>
      </div>
    </div>
  );
}
