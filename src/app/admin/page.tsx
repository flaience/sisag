"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AppointmentListItem = {
  id: string;
  scheduledTime: string;
  status: string;
  professionalName: string | null;
  clientName: string | null;
};

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function getStatusClasses(status: string) {
  const normalized = status?.toUpperCase?.() ?? "";

  if (normalized.includes("CONFIRMED")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (normalized.includes("CANCELLED")) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (normalized.includes("PENDING")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [appointmentsToday, setAppointmentsToday] = useState<
    AppointmentListItem[]
  >([]);
  const [peopleCount, setPeopleCount] = useState(0);
  const [professionalsCount, setProfessionalsCount] = useState(0);
  const [companiesCount, setCompaniesCount] = useState(0);

  const today = getTodayDate();

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        const [appointmentsRes, peopleRes, professionalsRes, companiesRes] =
          await Promise.all([
            fetch(`/api/v1/appointments?date=${today}`, { cache: "no-store" }),
            fetch("/api/v1/people", { cache: "no-store" }),
            fetch("/api/v1/professionals", { cache: "no-store" }),
            fetch("/api/v1/companies", { cache: "no-store" }),
          ]);

        const [appointmentsData, peopleData, professionalsData, companiesData] =
          await Promise.all([
            appointmentsRes.json().catch(() => []),
            peopleRes.json().catch(() => []),
            professionalsRes.json().catch(() => []),
            companiesRes.json().catch(() => []),
          ]);

        setAppointmentsToday(
          Array.isArray(appointmentsData) ? appointmentsData : [],
        );
        setPeopleCount(Array.isArray(peopleData) ? peopleData.length : 0);
        setProfessionalsCount(
          Array.isArray(professionalsData) ? professionalsData.length : 0,
        );
        setCompaniesCount(
          Array.isArray(companiesData) ? companiesData.length : 0,
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [today]);

  const stats = useMemo(() => {
    const total = appointmentsToday.length;
    const confirmed = appointmentsToday.filter((item) =>
      item.status?.toUpperCase?.().includes("CONFIRMED"),
    ).length;
    const pending = appointmentsToday.filter((item) =>
      item.status?.toUpperCase?.().includes("PENDING"),
    ).length;
    const cancelled = appointmentsToday.filter((item) =>
      item.status?.toUpperCase?.().includes("CANCELLED"),
    ).length;

    return {
      total,
      confirmed,
      pending,
      cancelled,
    };
  }, [appointmentsToday]);

  const nextAppointments = useMemo(() => {
    return [...appointmentsToday]
      .sort(
        (a, b) =>
          new Date(a.scheduledTime).getTime() -
          new Date(b.scheduledTime).getTime(),
      )
      .slice(0, 5);
  }, [appointmentsToday]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="w-full sm:w-auto"
          onClick={() => router.push("/admin/agenda")}
        >
          Ver agenda
        </Button>

        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => router.push("/admin/appointments/new")}
        >
          Novo agendamento
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Agendamentos hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {loading ? "..." : stats.total}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Confirmados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {loading ? "..." : stats.confirmed}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {loading ? "..." : stats.pending}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Cancelados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {loading ? "..." : stats.cancelled}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pessoas cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {loading ? "..." : peopleCount}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Profissionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {loading ? "..." : professionalsCount}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Empresas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {loading ? "..." : companiesCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Próximos agendamentos</CardTitle>

          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => router.push("/admin/appointments")}
          >
            Ver todos
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-slate-500">
              Carregando agendamentos...
            </div>
          ) : nextAppointments.length === 0 ? (
            <div className="text-sm text-slate-500">
              Nenhum agendamento encontrado para hoje.
            </div>
          ) : (
            nextAppointments.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {item.clientName ?? "Cliente não informado"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.professionalName ?? "Profissional não informado"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDateTime(item.scheduledTime)}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                      item.status,
                    )}`}
                  >
                    {item.status}
                  </span>

                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(`/admin/appointments/${item.id}/edit`)
                    }
                  >
                    Editar
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Ações rápidas</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/agenda")}
          >
            Agenda
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/admin/people")}
          >
            Pessoas
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/admin/professionals")}
          >
            Profissionais
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/admin/companies")}
          >
            Empresas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
