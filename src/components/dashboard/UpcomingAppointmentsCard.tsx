import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileClock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/time";

type UpcomingAppointmentItem = {
  id: string;
  clientName: string | null;
  serviceName?: string | null;
  startTime?: string | null;
  status: string;
};

type UpcomingAppointmentsCardProps = {
  items: UpcomingAppointmentItem[];
};

function getStatusClasses(status?: string | null) {
  const normalized = status?.toUpperCase?.() ?? "";

  if (normalized.includes("CONFIRMED")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (normalized.includes("PENDING")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized.includes("CANCELLED")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (normalized.includes("COMPLETED") || normalized.includes("DONE")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getStatusIcon(status?: string | null) {
  const normalized = status?.toUpperCase?.() ?? "";

  if (normalized.includes("CONFIRMED")) {
    return CheckCircle2;
  }

  if (normalized.includes("PENDING")) {
    return AlertCircle;
  }

  if (normalized.includes("CANCELLED")) {
    return XCircle;
  }

  return FileClock;
}

export function UpcomingAppointmentsCard({
  items,
}: UpcomingAppointmentsCardProps) {
  const previewItems = items.slice(0, 6);

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarDays className="h-5 w-5 text-slate-500" />
            Próximos atendimentos
          </CardTitle>

          <Button asChild variant="outline" size="sm">
            <Link href="/admin/bookings">
              Ver agenda completa
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {previewItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Nenhum atendimento próximo encontrado. Quando novos agendamentos
            entrarem no fluxo, eles aparecerão aqui.
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {previewItems.map((item) => {
                const StatusIcon = getStatusIcon(item.status);
                const hasStartTime = Boolean(item.startTime);

                return (
                  <Link
                    key={item.id}
                    href={`/admin/bookings/${item.id}/journey`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {item.clientName ?? "Cliente não identificado"}
                          </p>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                              item.status,
                            )}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {item.status}
                          </span>
                        </div>

                        <p className="mt-2 truncate text-sm text-slate-600">
                          {item.serviceName ?? "Serviço não identificado"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:justify-end">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {hasStartTime
                            ? formatDate(item.startTime!)
                            : "Data não informada"}
                        </span>

                        <span className="inline-flex items-center gap-2">
                          <Clock3 className="h-4 w-4" />
                          {hasStartTime
                            ? formatTime(item.startTime!)
                            : "Horário não informado"}
                        </span>

                        <span className="text-sm font-medium text-slate-900">
                          Abrir jornada
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">
                Leitura rápida
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Os próximos atendimentos ajudam a identificar o que precisa de
                confirmação, acompanhamento ou reação rápida ao longo do dia.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
