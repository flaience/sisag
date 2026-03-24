// src/app/admin/bookings/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  Search,
  Filter,
  ArrowRight,
  ClipboardCheck,
  Building2,
  Wrench,
  UserRound,
} from "lucide-react";

import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentCompany } from "@/modules/dashboard/getCurrentCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingQuickActions } from "@/components/booking/BookingQuickActions";

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

type BookingListItem = {
  id: string;
  companyId: string;
  clientId: string;
  startTime: string;
  endTime: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  clientName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  durationMinutes: number | null;
  professionalId: string | null;
  professionalName: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  if (normalized.includes("COMPLETED")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getStatusLabel(status?: string | null) {
  const normalized = status?.toUpperCase?.() ?? "";

  if (normalized === "PENDING") return "Pendente";
  if (normalized === "CONFIRMED") return "Confirmado";
  if (normalized === "CANCELLED") return "Cancelado";
  if (normalized === "COMPLETED") return "Concluído";

  return status ?? "—";
}

export default async function BookingsPage({ searchParams }: PageProps) {
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
            Bookings
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
  const status = resolvedSearchParams?.status ?? "ALL";
  const q = resolvedSearchParams?.q ?? "";
  const dateFrom = resolvedSearchParams?.dateFrom ?? "";
  const dateTo = resolvedSearchParams?.dateTo ?? "";

  const query = new URLSearchParams({
    companyId: company.id,
    status,
    q,
    dateFrom,
    dateTo,
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/v1/bookings?${query.toString()}`, {
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);

  const items: BookingListItem[] = json?.ok ? (json.items ?? []) : [];

  const summary = {
    total: items.length,
    pending: items.filter((row) => row.status === "PENDING").length,
    confirmed: items.filter((row) => row.status === "CONFIRMED").length,
    cancelled: items.filter((row) => row.status === "CANCELLED").length,
    completed: items.filter((row) => row.status === "COMPLETED").length,
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>{company.name}</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Bookings
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Acompanhe os atendimentos e navegue para a jornada de cada
              booking.
            </p>
          </div>
        </div>

        <Button asChild>
          <Link href="/admin/bookings/new">
            Novo booking
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="mt-2 text-3xl font-semibold">{summary.total}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <p className="mt-2 text-3xl font-semibold">{summary.pending}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Confirmados</p>
            <p className="mt-2 text-3xl font-semibold">{summary.confirmed}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Cancelados</p>
            <p className="mt-2 text-3xl font-semibold">{summary.cancelled}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Concluídos</p>
            <p className="mt-2 text-3xl font-semibold">{summary.completed}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-5 w-5 text-slate-500" />
            Filtros
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Busca
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Cliente, profissional, serviço..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                name="status"
                defaultValue={status}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="CONFIRMED">Confirmados</option>
                <option value="CANCELLED">Cancelados</option>
                <option value="COMPLETED">Concluídos</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Data inicial
              </label>
              <input
                type="date"
                name="dateFrom"
                defaultValue={dateFrom}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Data final
              </label>
              <input
                type="date"
                name="dateTo"
                defaultValue={dateTo}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" className="h-11 w-full">
                Aplicar filtros
              </Button>

              <Button asChild type="button" variant="outline" className="h-11">
                <Link href="/admin/bookings">Limpar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ClipboardCheck className="h-5 w-5 text-slate-500" />
            Lista de bookings
          </CardTitle>
        </CardHeader>

        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              Nenhum booking encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <Link
                      href={`/admin/bookings/${row.id}/journey`}
                      className="block min-w-0 flex-1"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold text-slate-900">
                              {row.clientName ?? "Cliente não identificado"}
                            </p>

                            <span
                              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                                row.status,
                              )}`}
                            >
                              {getStatusLabel(row.status)}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                            <span className="inline-flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              {row.serviceName ?? "Serviço não identificado"}
                            </span>

                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="h-4 w-4" />
                              {formatDate(row.startTime)}
                            </span>

                            <span className="inline-flex items-center gap-2">
                              <Clock3 className="h-4 w-4" />
                              {formatTime(row.startTime)}
                            </span>

                            <span className="inline-flex items-center gap-2">
                              <UserRound className="h-4 w-4" />
                              {row.professionalName ??
                                "Profissional não definido"}
                            </span>
                          </div>

                          {row.notes ? (
                            <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                              {row.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-900">
                          Abrir jornada
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </Link>

                    <div className="xl:w-[280px] xl:pl-4">
                      <BookingQuickActions
                        bookingId={row.id}
                        status={row.status}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
