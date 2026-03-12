"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SearchSelect } from "@/components/SearchSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchItem = {
  id: string;
  name: string;
};

type AppointmentListItem = {
  id: string;
  scheduledTime: string;
  status: string;
  professionalName: string | null;
  clientName: string | null;
};

type AgendaSlot = {
  time: string;
  type: "available" | "booked";
  appointment?: AppointmentListItem;
};

type ViewMode = "day" | "week";
type StatusFilter = "ALL" | "CONFIRMED" | "PENDING" | "CANCELLED";

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfWeek(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const dayStr = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${dayStr}`;
}

function getWeekDays(dateString: string) {
  const monday = startOfWeek(dateString);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
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

function buildAgendaSlots(
  availableSlots: string[],
  appointments: AppointmentListItem[],
): AgendaSlot[] {
  const bookedMap = new Map<string, AppointmentListItem>();

  for (const appointment of appointments) {
    bookedMap.set(extractTime(appointment.scheduledTime), appointment);
  }

  const availableSet = new Set(availableSlots);

  const allTimes = new Set<string>([
    ...availableSlots,
    ...appointments.map((item) => extractTime(item.scheduledTime)),
  ]);

  return Array.from(allTimes)
    .sort((a, b) => a.localeCompare(b))
    .map((time) => {
      const appointment = bookedMap.get(time);

      if (appointment) {
        return { time, type: "booked", appointment };
      }

      if (availableSet.has(time)) {
        return { time, type: "available" };
      }

      return { time, type: "available" };
    });
}

function groupAppointmentsByDay(
  appointments: AppointmentListItem[],
  weekDays: string[],
) {
  const initial: Record<string, AppointmentListItem[]> = Object.fromEntries(
    weekDays.map((day) => [day, []]),
  );

  for (const item of appointments) {
    const day = item.scheduledTime.slice(0, 10);
    if (!initial[day]) {
      initial[day] = [];
    }
    initial[day].push(item);
  }

  for (const day of Object.keys(initial)) {
    initial[day].sort(
      (a, b) =>
        new Date(a.scheduledTime).getTime() -
        new Date(b.scheduledTime).getTime(),
    );
  }

  return initial;
}

function isToday(dateString: string) {
  return dateString === getTodayDate();
}

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "PENDING", label: "Pendente" },
  { value: "CANCELLED", label: "Cancelado" },
];

export default function AgendaPage() {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedProfessional, setSelectedProfessional] =
    useState<SearchItem | null>(null);
  const [date, setDate] = useState(getTodayDate());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<
    Record<string, AppointmentListItem[]>
  >({});

  const [loadingDay, setLoadingDay] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDays(date), [date]);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const agendaSlots = useMemo(() => {
    return buildAgendaSlots(availableSlots, appointments);
  }, [availableSlots, appointments]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((item) =>
      item.status?.toUpperCase?.().includes("CONFIRMED"),
    ).length;
    const pending = appointments.filter((item) =>
      item.status?.toUpperCase?.().includes("PENDING"),
    ).length;
    const cancelled = appointments.filter((item) =>
      item.status?.toUpperCase?.().includes("CANCELLED"),
    ).length;

    return { total, confirmed, pending, cancelled };
  }, [appointments]);

  useEffect(() => {
    async function loadDayAgenda() {
      if (!selectedProfessional?.id || !date) {
        setAvailableSlots([]);
        setAppointments([]);
        setErrorMsg(null);
        return;
      }

      setLoadingDay(true);
      setErrorMsg(null);

      try {
        const statusParam =
          statusFilter !== "ALL" ? `&status=${statusFilter}` : "";

        const [slotsRes, appointmentsRes] = await Promise.all([
          fetch(
            `/api/v1/scheduling/available?professionalId=${selectedProfessional.id}&date=${date}`,
            { cache: "no-store" },
          ),
          fetch(
            `/api/v1/appointments?date=${date}&professionalId=${selectedProfessional.id}${statusParam}`,
            { cache: "no-store" },
          ),
        ]);

        const slotsData = await slotsRes.json();
        const appointmentsData = await appointmentsRes.json();

        if (!slotsRes.ok) {
          throw new Error(slotsData?.message ?? "Erro ao carregar horários.");
        }

        if (!appointmentsRes.ok) {
          throw new Error(
            appointmentsData?.message ?? "Erro ao carregar agendamentos.",
          );
        }

        setAvailableSlots(Array.isArray(slotsData) ? slotsData : []);
        setAppointments(
          Array.isArray(appointmentsData) ? appointmentsData : [],
        );
      } catch (error: any) {
        setAvailableSlots([]);
        setAppointments([]);
        setErrorMsg(error?.message ?? "Erro ao carregar agenda.");
      } finally {
        setLoadingDay(false);
      }
    }

    loadDayAgenda();
  }, [selectedProfessional, date, statusFilter]);

  useEffect(() => {
    async function loadWeekAgenda() {
      if (!selectedProfessional?.id) {
        setWeekAppointments({});
        return;
      }

      setLoadingWeek(true);

      try {
        const statusParam =
          statusFilter !== "ALL" ? `&status=${statusFilter}` : "";

        const res = await fetch(
          `/api/v1/appointments?dateFrom=${weekStart}&dateTo=${weekEnd}&professionalId=${selectedProfessional.id}${statusParam}`,
          { cache: "no-store" },
        );

        const data = await res.json().catch(() => []);

        if (!res.ok) {
          throw new Error(data?.message ?? "Erro ao carregar agenda semanal.");
        }

        const list = Array.isArray(data) ? data : [];
        setWeekAppointments(groupAppointmentsByDay(list, weekDays));
      } catch {
        setWeekAppointments(groupAppointmentsByDay([], weekDays));
      } finally {
        setLoadingWeek(false);
      }
    }

    loadWeekAgenda();
  }, [selectedProfessional, weekStart, weekEnd, weekDays, statusFilter]);

  function handleCreateAppointment(time: string) {
    if (!selectedProfessional) return;

    const params = new URLSearchParams({
      professionalId: selectedProfessional.id,
      professionalName: selectedProfessional.name,
      date,
      time,
    });

    router.push(`/admin/appointments/new?${params.toString()}`);
  }

  function goPrev() {
    setDate((prev) => addDays(prev, viewMode === "day" ? -1 : -7));
  }

  function goNext() {
    setDate((prev) => addDays(prev, viewMode === "day" ? 1 : 7));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="w-full sm:w-auto"
          onClick={() => router.push("/admin/appointments/new")}
        >
          Novo agendamento
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Filtros da agenda</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SearchSelect
              label="Profissional"
              placeholder="Buscar profissional..."
              fetchUrl="/api/v1/professionals/search?q="
              selectedLabel={selectedProfessional?.name}
              onSelect={(item) => setSelectedProfessional(item)}
            />

            <div className="space-y-2">
              <Label htmlFor="date">Data base</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={viewMode === "day" ? "default" : "outline"}
                onClick={() => setViewMode("day")}
              >
                Dia
              </Button>
              <Button
                type="button"
                variant={viewMode === "week" ? "default" : "outline"}
                onClick={() => setViewMode("week")}
              >
                Semana
              </Button>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={goPrev}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {viewMode === "day" ? "Dia anterior" : "Semana anterior"}
              </Button>

              <Button type="button" variant="outline" onClick={goNext}>
                {viewMode === "day" ? "Próximo dia" : "Próxima semana"}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedProfessional ? (
        <Card className="rounded-2xl">
          <CardContent className="p-6 text-sm text-slate-500">
            Selecione um profissional para visualizar a agenda.
          </CardContent>
        </Card>
      ) : errorMsg ? (
        <Card className="rounded-2xl border-red-200">
          <CardContent className="p-6 text-sm text-red-600">
            {errorMsg}
          </CardContent>
        </Card>
      ) : viewMode === "day" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Agendamentos do dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {stats.total}
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
                  {stats.confirmed}
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
                  {stats.pending}
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
                  {stats.cancelled}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="hidden rounded-2xl md:block">
            <CardHeader>
              <CardTitle>Agenda do dia</CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              {loadingDay ? (
                <div className="p-6 text-sm text-slate-500">
                  Carregando agenda...
                </div>
              ) : agendaSlots.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  Nenhum horário encontrado para esta data.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {agendaSlots.map((slot) => (
                    <div
                      key={slot.time}
                      className="flex items-center justify-between gap-4 px-6 py-4"
                    >
                      <div className="w-24 shrink-0 text-lg font-semibold text-slate-900">
                        {slot.time}
                      </div>

                      {slot.type === "booked" && slot.appointment ? (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900">
                              {slot.appointment.clientName ??
                                "Paciente sem nome"}
                            </p>
                            <p className="text-sm text-slate-500">
                              {slot.appointment.professionalName ??
                                "Profissional"}
                            </p>
                          </div>

                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                              slot.appointment.status,
                            )}`}
                          >
                            {slot.appointment.status}
                          </span>

                          <Button asChild variant="outline">
                            <Link
                              href={`/admin/appointments/${slot.appointment.id}/edit`}
                            >
                              Editar
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-emerald-700">
                              Horário disponível
                            </p>
                            <p className="text-sm text-slate-500">
                              Pronto para novo agendamento
                            </p>
                          </div>

                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            Disponível
                          </span>

                          <Button
                            onClick={() => handleCreateAppointment(slot.time)}
                          >
                            Agendar
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3 md:hidden">
            {loadingDay ? (
              <Card className="rounded-2xl">
                <CardContent className="p-4 text-sm text-slate-500">
                  Carregando agenda...
                </CardContent>
              </Card>
            ) : agendaSlots.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="p-4 text-sm text-slate-500">
                  Nenhum horário encontrado para esta data.
                </CardContent>
              </Card>
            ) : (
              agendaSlots.map((slot) => (
                <Card key={slot.time} className="rounded-2xl">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">Horário</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {slot.time}
                        </p>
                      </div>

                      {slot.type === "booked" && slot.appointment ? (
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                            slot.appointment.status,
                          )}`}
                        >
                          {slot.appointment.status}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          Disponível
                        </span>
                      )}
                    </div>

                    {slot.type === "booked" && slot.appointment ? (
                      <>
                        <div>
                          <p className="text-sm text-slate-500">Cliente</p>
                          <p className="font-medium text-slate-900">
                            {slot.appointment.clientName ?? "Paciente sem nome"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-500">Profissional</p>
                          <p className="text-slate-900">
                            {slot.appointment.professionalName ??
                              "Profissional"}
                          </p>
                        </div>

                        <Button asChild variant="outline" className="w-full">
                          <Link
                            href={`/admin/appointments/${slot.appointment.id}/edit`}
                          >
                            Editar agendamento
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleCreateAppointment(slot.time)}
                      >
                        Agendar neste horário
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <Card className="hidden rounded-2xl lg:block">
            <CardHeader>
              <CardTitle>Agenda semanal</CardTitle>
            </CardHeader>

            <CardContent>
              {loadingWeek ? (
                <div className="text-sm text-slate-500">
                  Carregando semana...
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-4">
                  {weekDays.map((day) => {
                    const dayItems = weekAppointments[day] ?? [];
                    const today = isToday(day);

                    return (
                      <div
                        key={day}
                        className={[
                          "min-h-[320px] rounded-2xl border p-3 transition-colors",
                          today
                            ? "border-blue-300 bg-blue-50/40"
                            : "border-slate-200 bg-white",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "mb-3 rounded-xl border pb-3 pt-2 text-center",
                            today
                              ? "border-blue-200 bg-blue-100/70"
                              : "border-slate-100 bg-slate-50",
                          ].join(" ")}
                        >
                          <p
                            className={[
                              "text-sm font-semibold",
                              today ? "text-blue-700" : "text-slate-900",
                            ].join(" ")}
                          >
                            {formatDayLabel(day)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {today
                              ? "Hoje"
                              : `${dayItems.length} agendamento(s)`}
                          </p>
                        </div>

                        <div className="space-y-2">
                          {dayItems.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-400">
                              Sem agendamentos
                            </div>
                          ) : (
                            dayItems.map((item) => (
                              <Link
                                key={item.id}
                                href={`/admin/appointments/${item.id}/edit`}
                                className={[
                                  "block rounded-xl border p-3 transition-colors hover:bg-white",
                                  today
                                    ? "border-blue-200 bg-white/80"
                                    : "border-slate-200 bg-white",
                                ].join(" ")}
                              >
                                <p className="text-sm font-semibold text-slate-900">
                                  {extractTime(item.scheduledTime)}
                                </p>
                                <p className="mt-1 text-sm text-slate-700">
                                  {item.clientName ?? "Paciente"}
                                </p>
                                <span
                                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusClasses(
                                    item.status,
                                  )}`}
                                >
                                  {item.status}
                                </span>
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3 lg:hidden">
            {loadingWeek ? (
              <Card className="rounded-2xl">
                <CardContent className="p-4 text-sm text-slate-500">
                  Carregando semana...
                </CardContent>
              </Card>
            ) : (
              weekDays.map((day) => {
                const dayItems = weekAppointments[day] ?? [];
                const today = isToday(day);

                return (
                  <Card
                    key={day}
                    className={[
                      "rounded-2xl",
                      today ? "border-blue-300 bg-blue-50/30" : "",
                    ].join(" ")}
                  >
                    <CardHeader>
                      <CardTitle
                        className={[
                          "text-base",
                          today ? "text-blue-700" : "text-slate-900",
                        ].join(" ")}
                      >
                        {formatDayLabel(day)} {today ? "• Hoje" : ""}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      {dayItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                          Sem agendamentos
                        </div>
                      ) : (
                        dayItems.map((item) => (
                          <Link
                            key={item.id}
                            href={`/admin/appointments/${item.id}/edit`}
                            className={[
                              "block rounded-xl border p-3 transition-colors hover:bg-slate-50",
                              today
                                ? "border-blue-200 bg-white"
                                : "border-slate-200",
                            ].join(" ")}
                          >
                            <p className="font-medium text-slate-900">
                              {extractTime(item.scheduledTime)} •{" "}
                              {item.clientName ?? "Paciente"}
                            </p>
                            <p className="text-sm text-slate-500">
                              {item.professionalName ?? "Profissional"}
                            </p>
                            <span
                              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                                item.status,
                              )}`}
                            >
                              {item.status}
                            </span>
                          </Link>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
