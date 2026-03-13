"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  Sparkles,
  Wrench,
  Activity,
  Bot,
  ArrowLeft,
  MessageCircleMore,
  Phone,
  Mail,
  UserRound,
  Send,
  Stars,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BookingJourneyResponse = {
  ok: true;
  booking: {
    id: string;
    companyId: string;
    clientId: string;
    startTime: string;
    status: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  client: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  items: Array<{
    id: string;
    bookingId: string;
    serviceId: string;
    serviceName: string | null;
    durationMinutes: number;
    price: string | null;
    startTime: string;
    endTime: string;
    createdAt: string;
  }>;
  allocations: Array<{
    id: string;
    bookingItemId: string;
    resourceId: string;
    resourceName: string | null;
    startTime: string | null;
    endTime: string | null;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    type: string;
    actor: string;
    payload: unknown;
    createdAt: string;
    outboxId: string | null;
    sessionId: string | null;
  }>;
  automationJobs: Array<{
    id: string;
    type: string;
    status: string;
    runAt: string;
    attempts: number;
    lastError: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  conversationSessions: Array<{
    id: string;
    status: string;
    context: unknown;
    createdAt: string;
    updatedAt: string;
  }>;
  messageLogs: Array<{
    id: string;
    channel: string;
    provider: string;
    toPhone: string;
    messageType: string;
    body: string;
    status: string;
    providerMessageId: string | null;
    error: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
    failedAt: string | null;
    createdAt: string;
  }>;
};

type Props = {
  params: {
    id: string;
  };
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClasses(status?: string | null) {
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

  if (normalized.includes("DONE") || normalized.includes("COMPLETED")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (normalized.includes("FAILED")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (normalized.includes("OPEN")) {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  if (normalized.includes("CLOSED")) {
    return "bg-slate-100 text-slate-700 border-slate-300";
  }

  if (normalized.includes("SYSTEM")) {
    return "bg-violet-50 text-violet-700 border-violet-200";
  }

  if (normalized.includes("ADMIN")) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  if (normalized.includes("WHATSAPP")) {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (normalized.includes("N8N")) {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function getJourneySummary(
  eventCount: number,
  jobCount: number,
  allocationCount: number,
) {
  return {
    pre:
      allocationCount > 0
        ? "Recursos já previstos para o atendimento."
        : "Ainda sem recursos previstos para o atendimento.",
    during:
      eventCount > 0
        ? "A jornada já possui eventos registrados."
        : "Ainda não há eventos registrados nesta jornada.",
    post:
      jobCount > 0
        ? "Existem automações planejadas para continuidade da experiência."
        : "Ainda não há automações configuradas para continuidade da experiência.",
  };
}

function getLatestMessage(messages: BookingJourneyResponse["messageLogs"]) {
  return messages[0] ?? null;
}

function getNextAutomationJob(jobs: BookingJourneyResponse["automationJobs"]) {
  if (!jobs.length) return null;

  const sorted = [...jobs].sort(
    (a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime(),
  );

  return sorted[0] ?? null;
}

function getExperienceInsight(data: BookingJourneyResponse) {
  const status = data.booking.status?.toUpperCase?.() ?? "";
  const hasMessages = data.messageLogs.length > 0;
  const hasJobs = data.automationJobs.length > 0;

  if (status.includes("CONFIRMED")) {
    return {
      preTitle: "Atendimento confirmado",
      preText: hasMessages
        ? "O cliente já recebeu comunicação e o atendimento está numa boa posição para acontecer com previsibilidade."
        : "O atendimento está confirmado, mas ainda há espaço para reforçar a comunicação prévia e alinhar expectativas.",
      postTitle: "Valorização após o atendimento",
      postText: hasJobs
        ? "Já existem ações planejadas para manter o relacionamento após o serviço."
        : "Depois do atendimento, vale ativar follow-up, feedback e valorização do cliente.",
    };
  }

  if (status.includes("PENDING")) {
    return {
      preTitle: "Confirmação em construção",
      preText:
        "Este é um bom momento para reforçar previsão do serviço, preparo do cliente e mensagem de confirmação.",
      postTitle: "Pós-atendimento ainda não iniciado",
      postText:
        "A jornada posterior pode ser preparada desde agora com automações e próximos passos.",
    };
  }

  if (status.includes("CANCELLED")) {
    return {
      preTitle: "Jornada interrompida",
      preText:
        "O atendimento foi interrompido. A melhor ação costuma ser retomar o contato e oferecer novo caminho ao cliente.",
      postTitle: "Relacionamento a recuperar",
      postText:
        "Aqui pode entrar uma estratégia de reconquista, reativação e acolhimento do cliente.",
    };
  }

  return {
    preTitle: "Pré-atendimento",
    preText:
      "A jornada prévia pode alinhar expectativa, previsibilidade e segurança para o cliente.",
    postTitle: "Pós-atendimento",
    postText: "O pós-atendimento pode fortalecer percepção de cuidado e valor.",
  };
}

export default function BookingJourneyPage({ params }: Props) {
  const router = useRouter();
  const [data, setData] = useState<BookingJourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/v1/bookings/${params.id}/journey`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          setData(null);
          return;
        }

        setData(json);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params.id]);

  const summary = useMemo(() => {
    return getJourneySummary(
      data?.events.length ?? 0,
      data?.automationJobs.length ?? 0,
      data?.allocations.length ?? 0,
    );
  }, [data]);

  const latestMessage = useMemo(
    () => (data ? getLatestMessage(data.messageLogs) : null),
    [data],
  );

  const nextJob = useMemo(
    () => (data ? getNextAutomationJob(data.automationJobs) : null),
    [data],
  );

  const insight = useMemo(
    () =>
      data
        ? getExperienceInsight(data)
        : {
            preTitle: "",
            preText: "",
            postTitle: "",
            postText: "",
          },
    [data],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Carregando jornada do booking...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Booking não encontrado.
        </div>
      </div>
    );
  }

  const firstItem = data.items[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">Cliente da jornada</p>
              <h2 className="truncate text-2xl font-bold text-slate-900">
                {data.client.name ?? "Cliente não identificado"}
              </h2>

              <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {data.client.phone ?? "Telefone não informado"}
                </span>

                <span className="inline-flex items-center gap-2 break-all">
                  <Mail className="h-4 w-4" />
                  {data.client.email ?? "E-mail não informado"}
                </span>
              </div>
            </div>

            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                data.booking.status,
              )}`}
            >
              {data.booking.status}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Cliente</p>
              <p className="font-medium text-slate-900">
                {data.client.name ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Data</p>
              <p className="font-medium text-slate-900">
                {formatDate(data.booking.startTime)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Horário</p>
              <p className="font-medium text-slate-900">
                {formatTime(data.booking.startTime)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Serviço previsto</p>
              <p className="font-medium text-slate-900">
                {firstItem?.serviceName ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Última comunicação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!latestMessage ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Ainda não há comunicação registrada para este cliente.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-slate-900">
                    {latestMessage.messageType}
                  </p>
                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                      latestMessage.status,
                    )}`}
                  >
                    {latestMessage.status}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-600 line-clamp-4">
                  {latestMessage.body}
                </p>

                <p className="mt-3 text-xs text-slate-500">
                  Registrada em: {formatDateTime(latestMessage.createdAt)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stars className="h-5 w-5" />
              Próxima ação prevista
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!nextJob ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Ainda não há automação planejada para este booking.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-slate-900">{nextJob.type}</p>
                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                      nextJob.status,
                    )}`}
                  >
                    {nextJob.status}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-600">
                  Execução prevista: {formatDateTime(nextJob.runAt)}
                </p>

                <p className="text-sm text-slate-600">
                  Tentativas: {nextJob.attempts}
                </p>

                {nextJob.lastError && (
                  <p className="mt-2 text-sm text-rose-600">
                    Último erro: {nextJob.lastError}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{insight.preTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>{summary.pre}</p>
            <p>{insight.preText}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Durante o atendimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>{summary.during}</p>
            <p>
              A jornada pode registrar confirmação, alterações, execução e
              marcos relevantes do atendimento.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{insight.postTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>{summary.post}</p>
            <p>{insight.postText}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Serviço previsto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Nenhum item de serviço encontrado para este booking.
              </div>
            ) : (
              data.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="font-medium text-slate-900">
                    {item.serviceName ?? "Serviço"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Duração prevista: {item.durationMinutes} min
                  </p>
                  <p className="text-sm text-slate-600">
                    Início: {formatDateTime(item.startTime)}
                  </p>
                  <p className="text-sm text-slate-600">
                    Fim: {formatDateTime(item.endTime)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recursos alocados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.allocations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Nenhum recurso alocado encontrado.
              </div>
            ) : (
              data.allocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="font-medium text-slate-900">
                    {allocation.resourceName ?? "Recurso"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Início: {formatDateTime(allocation.startTime)}
                  </p>
                  <p className="text-sm text-slate-600">
                    Fim: {formatDateTime(allocation.endTime)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircleMore className="h-5 w-5" />
              Comunicação com o cliente
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">
                {data.client.name ?? "Cliente"}
              </p>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {data.client.phone ?? "Telefone não informado"}
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {data.client.email ?? "E-mail não informado"}
                </p>
              </div>
            </div>

            {data.messageLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Ainda não há mensagens registradas para este cliente.
              </div>
            ) : (
              data.messageLogs.slice(0, 5).map((message) => (
                <div
                  key={message.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-slate-900">
                      {message.messageType}
                    </p>
                    <span
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                        message.status,
                      )}`}
                    >
                      {message.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                    {message.body}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {formatDateTime(message.createdAt)}
                  </p>

                  {message.error && (
                    <p className="mt-2 text-xs text-rose-600">
                      Erro: {message.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Sessões de conversa
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {data.conversationSessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Ainda não há sessões de conversa registradas para este cliente.
              </div>
            ) : (
              data.conversationSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-slate-900">
                      Sessão {session.id.slice(0, 8)}
                    </p>
                    <span
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                        session.status,
                      )}`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    Criada em: {formatDateTime(session.createdAt)}
                  </p>
                  <p className="text-sm text-slate-600">
                    Atualizada em: {formatDateTime(session.updatedAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Eventos da jornada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Ainda não há eventos registrados para este booking.
              </div>
            ) : (
              data.events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-slate-900">{event.type}</p>
                    <span
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                        event.actor,
                      )}`}
                    >
                      {event.actor}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Automações planejadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.automationJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Ainda não há automações vinculadas a este booking.
              </div>
            ) : (
              data.automationJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-slate-900">{job.type}</p>
                    <span
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                        job.status,
                      )}`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    Execução prevista: {formatDateTime(job.runAt)}
                  </p>

                  <p className="text-sm text-slate-600">
                    Tentativas: {job.attempts}
                  </p>

                  {job.lastError && (
                    <p className="mt-2 text-sm text-rose-600">
                      Último erro: {job.lastError}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Registro do booking</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Criado em</p>
            <p className="font-medium text-slate-900">
              {formatDateTime(data.booking.createdAt)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Atualizado em</p>
            <p className="font-medium text-slate-900">
              {formatDateTime(data.booking.updatedAt)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
