//src/app/admin/bookings/[id]/journey/page.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
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
  FileText,
  MessageSquare,
  Workflow,
  History,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { ScheduleSlotPicker } from "@/components/ScheduleSlotPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatDate,
  formatDateTime,
  formatTime,
  zonedDateTimeToUtcISOString,
} from "@/lib/time";
import type { LucideIcon } from "lucide-react";

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
  rescheduleTarget: {
    professionalId: string;
    professionalName: string | null;
    resourceId: string | null;
  } | null;
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
    createdAt: string | null;
    updatedAt: string | null;
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
    createdAt: string | null;
  }>;
  lastMessage: {
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
    createdAt: string | null;
  } | null;
  nextAutomationJob: {
    id: string;
    type: string;
    status: string;
    runAt: string;
    attempts: number;
    lastError: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  experienceSummary: {
    preTitle: string;
    preText: string;
    duringText: string;
    postTitle: string;
    postText: string;
  };
  suggestedPreMessage?: string;
  suggestedPostMessage?: string;
};

type Props = {
  params: {
    id: string;
  };
};

type TimelineItem = {
  id: string;
  date: string | null;
  title: string;
  description: string;
  kind: "booking" | "event" | "message" | "automation" | "session";
  status?: string | null;
};

type RecommendedAction = {
  title: string;
  description: string;
  tone: "default" | "warning" | "success";
  actionType: "send_pre" | "send_post" | "open_pre" | "monitor";
};

type BookingQuickSignal = {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  icon: LucideIcon;
  actionType?:
    | "scroll_service"
    | "scroll_resources"
    | "scroll_messages"
    | "scroll_automation"
    | "open_new_booking"
    | "open_source_booking";
};

type JourneyHealthItem = {
  label: string;
  status: "ok" | "attention" | "critical";
  title: string;
  description: string;
  actionLabel?: string;
  actionType?:
    | "scroll_messages"
    | "scroll_automation"
    | "scroll_resources"
    | "open_recreate"
    | "open_new_booking"
    | "open_source_booking"
    | "open_reschedule"
    | "confirm_booking";
};

type JourneyScore = {
  score: number;
  label: "Saudável" | "Atenção" | "Crítico";
  tone: "ok" | "attention" | "critical";
  summary: string;
};

type JourneyScoreBreakdownItem = {
  label: string;
  impact: number;
  status: "positive" | "neutral" | "negative";
  description: string;
};

type JourneyScoreDetails = {
  score: JourneyScore;
  breakdown: JourneyScoreBreakdownItem[];
  nextBestAction: string;
  nextBestActionLabel?: string;
  nextBestActionType?:
    | "confirm_booking"
    | "scroll_messages"
    | "scroll_automation"
    | "scroll_resources"
    | "open_recreate";
};

type JourneyOpportunity = {
  id: string;
  title: string;
  description: string;
  tone: "default" | "warning" | "danger" | "success";
  actionLabel?: string;
  actionType?:
    | "scroll_messages"
    | "scroll_automation"
    | "scroll_resources"
    | "open_recreate"
    | "confirm_booking"
    | "open_reschedule";
};

type JourneyInsight = {
  id: string;
  title: string;
  description: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
};
type JourneySuggestedCommunication = {
  id: string;
  title: string;
  description: string;
  message: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
  category: "pre" | "recovery" | "reminder" | "post";
};
function getQuickSignalClasses(tone?: BookingQuickSignal["tone"]) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function buildQuickSignals(input: {
  data: BookingJourneyResponse;
  firstItem: BookingJourneyResponse["items"][number] | null;
  relatedBookingLinks: {
    newBookingId: string | null;
    sourceBookingId: string | null;
  };
}) {
  const signals: BookingQuickSignal[] = [];
  const status = input.data.booking.status?.toUpperCase?.() ?? "";

  signals.push({
    label: "Status do booking",
    value: input.data.booking.status,
    helper:
      status === "CONFIRMED"
        ? "Atendimento pronto para execução"
        : status === "PENDING"
          ? "Aguardando consolidação"
          : status === "CANCELLED"
            ? "Fluxo interrompido"
            : status === "COMPLETED"
              ? "Atendimento encerrado"
              : "Estado atual do booking",
    tone:
      status === "CONFIRMED"
        ? "success"
        : status === "PENDING"
          ? "warning"
          : status === "CANCELLED"
            ? "danger"
            : status === "COMPLETED"
              ? "info"
              : "default",
    icon: Activity,
  });

  signals.push({
    label: "Serviço principal",
    value: input.firstItem?.serviceName ?? "Não identificado",
    helper: input.firstItem
      ? `${input.firstItem.durationMinutes} min previstos`
      : "Sem item principal detectado",
    tone: "default",
    icon: Wrench,
    actionType: "scroll_service",
  });

  signals.push({
    label: "Recursos",
    value:
      input.data.allocations.length > 0
        ? `${input.data.allocations.length} alocado(s)`
        : "Sem alocação",
    helper:
      input.data.allocations.length > 0
        ? "Recursos previstos para execução"
        : "Ainda não há recursos vinculados",
    tone: input.data.allocations.length > 0 ? "success" : "warning",
    icon: UserRound,
    actionType: "scroll_resources",
  });

  signals.push({
    label: "Comunicação",
    value: input.data.lastMessage ? input.data.lastMessage.status : "Nenhuma",
    helper: input.data.lastMessage
      ? "Última interação registrada"
      : "Cliente sem mensagem vinculada",
    tone: input.data.lastMessage ? "info" : "warning",
    icon: MessageCircleMore,
    actionType: "scroll_messages",
  });

  signals.push({
    label: "Automação",
    value: input.data.nextAutomationJob
      ? input.data.nextAutomationJob.type
      : "Nenhuma",
    helper: input.data.nextAutomationJob
      ? "Próxima automação planejada"
      : "Sem job futuro previsto",
    tone: input.data.nextAutomationJob ? "success" : "default",
    icon: Bot,
    actionType: "scroll_automation",
  });

  if (input.relatedBookingLinks.newBookingId) {
    signals.push({
      label: "Relacionamento",
      value: "Gerou novo booking",
      helper: input.relatedBookingLinks.newBookingId.slice(0, 8),
      tone: "info",
      icon: History,
      actionType: "open_new_booking",
    });
  } else if (input.relatedBookingLinks.sourceBookingId) {
    signals.push({
      label: "Relacionamento",
      value: "Veio de retomada",
      helper: input.relatedBookingLinks.sourceBookingId.slice(0, 8),
      tone: "info",
      icon: History,
      actionType: "open_source_booking",
    });
  }

  return signals;
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

  if (normalized.includes("RESCHEDULED")) {
    return "bg-violet-50 text-violet-700 border-violet-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

async function copyToClipboard(text?: string) {
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    alert("Mensagem copiada.");
  } catch {
    alert("Não foi possível copiar a mensagem.");
  }
}

function buildWhatsAppLink(phone?: string | null, text?: string) {
  if (!phone || !text) return null;

  const normalizedPhone = phone.replace(/\D/g, "");
  if (!normalizedPhone) return null;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractRescheduleDescription(payload: unknown) {
  if (!isRecord(payload)) {
    return "Booking reagendado.";
  }

  const before = isRecord(payload.before) ? payload.before : null;
  const after = isRecord(payload.after) ? payload.after : null;

  const oldStartTime =
    typeof before?.oldStartTime === "string"
      ? before.oldStartTime
      : typeof before?.startTime === "string"
        ? before.startTime
        : null;

  const newStartTime =
    typeof after?.newStartTime === "string"
      ? after.newStartTime
      : typeof after?.startTime === "string"
        ? after.startTime
        : null;

  const reason =
    typeof payload.reason === "string" && payload.reason.trim()
      ? payload.reason.trim()
      : null;

  const oldLabel = oldStartTime
    ? formatDateTime(oldStartTime)
    : "horário anterior não identificado";
  const newLabel = newStartTime
    ? formatDateTime(newStartTime)
    : "novo horário não identificado";

  if (reason) {
    return `Reagendado de ${oldLabel} para ${newLabel}. Motivo: ${reason}.`;
  }

  return `Reagendado de ${oldLabel} para ${newLabel}.`;
}

function getEventDescription(event: BookingJourneyResponse["events"][number]) {
  if (event.type === "booking.rescheduled") {
    return extractRescheduleDescription(event.payload);
  }

  if (event.type === "booking.created") {
    return "Booking criado no sistema.";
  }

  if (event.type === "booking.confirmed") {
    if (isRecord(event.payload)) {
      const startTime =
        typeof event.payload.startTime === "string"
          ? event.payload.startTime
          : null;

      if (startTime) {
        return `Booking confirmado para ${formatDateTime(startTime)}.`;
      }
    }

    return "Booking confirmado para seguir a jornada de atendimento.";
  }

  if (event.type === "booking.cancelled") {
    if (isRecord(event.payload)) {
      const reason =
        typeof event.payload.reason === "string" && event.payload.reason.trim()
          ? event.payload.reason.trim()
          : null;

      const startTime =
        typeof event.payload.startTime === "string"
          ? event.payload.startTime
          : null;

      if (reason && startTime) {
        return `Booking de ${formatDateTime(startTime)} cancelado. Motivo: ${reason}.`;
      }

      if (reason) {
        return `Booking cancelado. Motivo: ${reason}.`;
      }

      if (startTime) {
        return `Booking de ${formatDateTime(startTime)} cancelado e recursos liberados.`;
      }
    }

    return "Booking cancelado e recursos liberados.";
  }

  if (event.type === "booking.completed") {
    return "Booking concluído.";
  }

  if (event.type === "booking.recreated_origin") {
    if (isRecord(event.payload)) {
      const newStartTime =
        typeof event.payload.newStartTime === "string"
          ? event.payload.newStartTime
          : null;

      const newBookingId =
        typeof event.payload.newBookingId === "string"
          ? event.payload.newBookingId
          : null;

      const reason =
        typeof event.payload.reason === "string" && event.payload.reason.trim()
          ? event.payload.reason.trim()
          : null;

      if (newStartTime && newBookingId && reason) {
        return `Este booking originou um novo atendimento para ${formatDateTime(newStartTime)}. Motivo: ${reason}. Novo booking: ${newBookingId.slice(0, 8)}.`;
      }

      if (newStartTime && newBookingId) {
        return `Este booking originou um novo atendimento para ${formatDateTime(newStartTime)}. Novo booking: ${newBookingId.slice(0, 8)}.`;
      }
    }

    return "Este booking originou um novo atendimento.";
  }

  if (event.type === "booking.recreated_from_cancelled") {
    if (isRecord(event.payload)) {
      const sourceBookingId =
        typeof event.payload.sourceBookingId === "string"
          ? event.payload.sourceBookingId
          : null;

      const sourceBookingStartTime =
        typeof event.payload.sourceBookingStartTime === "string"
          ? event.payload.sourceBookingStartTime
          : null;

      if (sourceBookingId && sourceBookingStartTime) {
        return `Este booking nasceu da retomada de um cancelado anterior (${formatDateTime(sourceBookingStartTime)}). Origem: ${sourceBookingId.slice(0, 8)}.`;
      }
    }

    return "Este booking foi criado a partir de um cancelamento anterior.";
  }

  return `Evento registrado por: ${event.actor}`;
}

function buildTimeline(data: BookingJourneyResponse): TimelineItem[] {
  const items: TimelineItem[] = [];

  items.push({
    id: `booking-${data.booking.id}`,
    date: data.booking.createdAt,
    title: "Booking criado",
    description: `Status inicial do booking: ${data.booking.status}`,
    kind: "booking",
    status: data.booking.status,
  });

  for (const event of data.events) {
    const friendlyTitle =
      event.type === "booking.rescheduled"
        ? "Booking reagendado"
        : event.type === "booking.created"
          ? "Booking criado"
          : event.type === "booking.confirmed"
            ? "Booking confirmado"
            : event.type === "booking.cancelled"
              ? "Booking cancelado"
              : event.type === "booking.completed"
                ? "Booking concluído"
                : event.type === "booking.recreated_origin"
                  ? "Retomada iniciada"
                  : event.type === "booking.recreated_from_cancelled"
                    ? "Booking retomado"
                    : event.type;
    items.push({
      id: `event-${event.id}`,
      date: event.createdAt,
      title: friendlyTitle,
      description: getEventDescription(event),
      kind: "event",
      status: event.actor,
    });
  }
  for (const message of data.messageLogs) {
    items.push({
      id: `message-${message.id}`,
      date: message.createdAt,
      title: `Mensagem ${message.messageType}`,
      description: message.body,
      kind: "message",
      status: message.status,
    });
  }

  for (const job of data.automationJobs) {
    items.push({
      id: `job-${job.id}`,
      date: job.runAt,
      title: `Automação ${job.type}`,
      description: `Tentativas realizadas: ${job.attempts}`,
      kind: "automation",
      status: job.status,
    });
  }

  for (const session of data.conversationSessions) {
    items.push({
      id: `session-${session.id}`,
      date: session.updatedAt,
      title: "Sessão de conversa",
      description: `Sessão atualmente ${session.status}`,
      kind: "session",
      status: session.status,
    });
  }

  return items.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });
}

function getTimelineIcon(kind: TimelineItem["kind"]) {
  switch (kind) {
    case "booking":
      return FileText;
    case "event":
      return History;
    case "message":
      return MessageSquare;
    case "automation":
      return Workflow;
    case "session":
      return MessageCircleMore;
    default:
      return Activity;
  }
}

function getTimelineIconClasses(kind: TimelineItem["kind"]) {
  switch (kind) {
    case "booking":
      return "bg-slate-100 text-slate-700";
    case "event":
      return "bg-violet-50 text-violet-700";
    case "message":
      return "bg-green-50 text-green-700";
    case "automation":
      return "bg-orange-50 text-orange-700";
    case "session":
      return "bg-sky-50 text-sky-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getRecommendedAction(data: BookingJourneyResponse): RecommendedAction {
  const status = data.booking.status?.toUpperCase?.() ?? "";
  const hasLastMessage = Boolean(data.lastMessage);
  const hasNextAutomation = Boolean(data.nextAutomationJob);

  if (status.includes("CANCELLED")) {
    return {
      title: "Retomar contato com o cliente",
      description:
        "Este booking foi cancelado. O próximo passo mais indicado é retomar a conversa e oferecer um novo caminho, como reagendamento ou reativação.",
      tone: "warning",
      actionType: "open_pre",
    };
  }

  if (status.includes("PENDING") && !hasLastMessage) {
    return {
      title: "Enviar comunicação de pré-atendimento",
      description:
        "O booking ainda está pendente e não há mensagem registrada. Vale iniciar o contato para alinhar expectativa, confirmar presença e preparar o cliente.",
      tone: "warning",
      actionType: "send_pre",
    };
  }

  if (status.includes("PENDING") && hasLastMessage) {
    return {
      title: "Acompanhar confirmação do atendimento",
      description:
        "Já existe comunicação registrada. O próximo passo é acompanhar a resposta do cliente e consolidar a confirmação do atendimento.",
      tone: "default",
      actionType: "open_pre",
    };
  }

  if (status.includes("CONFIRMED") && hasNextAutomation) {
    return {
      title: "Acompanhar a próxima automação",
      description:
        "O atendimento está confirmado e já há uma ação planejada. O melhor passo agora é monitorar a automação e garantir continuidade da experiência.",
      tone: "success",
      actionType: "monitor",
    };
  }

  if (status.includes("CONFIRMED") && !hasNextAutomation) {
    return {
      title: "Preparar o pós-atendimento",
      description:
        "O atendimento está confirmado, mas ainda não há automação futura. Vale configurar follow-up, valorização e continuidade do relacionamento.",
      tone: "default",
      actionType: "send_post",
    };
  }

  return {
    title: "Monitorar a jornada",
    description:
      "Acompanhe os eventos, mensagens e automações para manter a experiência do cliente consistente antes e depois do atendimento.",
    tone: "default",
    actionType: "monitor",
  };
}

function getRecommendedActionClasses(tone: RecommendedAction["tone"]) {
  switch (tone) {
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

async function sendSuggestedMessage(params: {
  bookingId: string;
  type: "pre" | "post";
}) {
  const res = await fetch(`/api/v1/bookings/${params.bookingId}/send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: params.type,
    }),
  });

  const response = await res.json().catch(() => null);

  if (!res.ok || !response?.ok) {
    throw new Error(response?.message ?? response?.error ?? "Falha ao enviar.");
  }

  return response;
}

function getReschedulePayload(payload: unknown) {
  if (!isRecord(payload)) return null;

  const before = isRecord(payload.before) ? payload.before : null;
  const after = isRecord(payload.after) ? payload.after : null;

  const oldStartTime =
    typeof before?.oldStartTime === "string"
      ? before.oldStartTime
      : typeof before?.startTime === "string"
        ? before.startTime
        : null;

  const newStartTime =
    typeof after?.newStartTime === "string"
      ? after.newStartTime
      : typeof after?.startTime === "string"
        ? after.startTime
        : null;

  const reason =
    typeof payload.reason === "string" && payload.reason.trim()
      ? payload.reason.trim()
      : null;

  return {
    oldStartTime,
    newStartTime,
    reason,
  };
}

function getRescheduleEvents(events: BookingJourneyResponse["events"]) {
  return events.filter((event) => event.type === "booking.rescheduled");
}

function getLastRescheduleEvent(events: BookingJourneyResponse["events"]) {
  const reschedules = getRescheduleEvents(events);

  if (reschedules.length === 0) return null;

  return [...reschedules].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}
function getRecreatedOriginEvent(events: BookingJourneyResponse["events"]) {
  return (
    events.find((event) => event.type === "booking.recreated_origin") ?? null
  );
}

function getRecreatedFromCancelledEvent(
  events: BookingJourneyResponse["events"],
) {
  return (
    events.find((event) => event.type === "booking.recreated_from_cancelled") ??
    null
  );
}

function getRelatedBookingLinks(events: BookingJourneyResponse["events"]) {
  const originEvent = getRecreatedOriginEvent(events);
  const recreatedEvent = getRecreatedFromCancelledEvent(events);

  let newBookingId: string | null = null;
  let sourceBookingId: string | null = null;

  if (originEvent && isRecord(originEvent.payload)) {
    newBookingId =
      typeof originEvent.payload.newBookingId === "string"
        ? originEvent.payload.newBookingId
        : null;
  }

  if (recreatedEvent && isRecord(recreatedEvent.payload)) {
    sourceBookingId =
      typeof recreatedEvent.payload.sourceBookingId === "string"
        ? recreatedEvent.payload.sourceBookingId
        : null;
  }

  return {
    newBookingId,
    sourceBookingId,
  };
}

function getBookingStatus(value?: string | null) {
  return value?.toUpperCase?.() ?? "";
}

function getJourneyHealthClasses(status: JourneyHealthItem["status"]) {
  switch (status) {
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "attention":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "critical":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

function getJourneyHealthDotClasses(status: JourneyHealthItem["status"]) {
  switch (status) {
    case "ok":
      return "bg-emerald-500";
    case "attention":
      return "bg-amber-500";
    case "critical":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

function buildJourneyHealth(input: {
  data: BookingJourneyResponse;
  relatedBookingLinks: {
    newBookingId: string | null;
    sourceBookingId: string | null;
  };
}) {
  const status = input.data.booking.status?.toUpperCase?.() ?? "";

  const items: JourneyHealthItem[] = [];

  items.push({
    label: "Status operacional",
    status:
      status === "CONFIRMED" || status === "COMPLETED"
        ? "ok"
        : status === "PENDING"
          ? "attention"
          : "critical",
    title:
      status === "CONFIRMED"
        ? "Booking confirmado"
        : status === "PENDING"
          ? "Booking pendente"
          : status === "COMPLETED"
            ? "Booking concluído"
            : status === "CANCELLED"
              ? "Booking cancelado"
              : "Status não mapeado",
    description:
      status === "CONFIRMED"
        ? "A jornada está operacionalmente pronta para execução."
        : status === "PENDING"
          ? "Ainda depende de consolidação ou confirmação."
          : status === "COMPLETED"
            ? "O atendimento já foi encerrado."
            : status === "CANCELLED"
              ? "O fluxo foi interrompido e pede retomada comercial."
              : "Verifique o estado atual do booking.",
    actionLabel:
      status === "PENDING"
        ? "Confirmar booking"
        : status === "CANCELLED"
          ? "Retomar atendimento"
          : undefined,
    actionType:
      status === "PENDING"
        ? "confirm_booking"
        : status === "CANCELLED"
          ? "open_recreate"
          : undefined,
  });

  items.push({
    label: "Comunicação",
    status: input.data.lastMessage ? "ok" : "attention",
    title: input.data.lastMessage
      ? "Comunicação registrada"
      : "Sem comunicação recente",
    description: input.data.lastMessage
      ? "Existe pelo menos uma mensagem vinculada à jornada."
      : "Vale iniciar contato para orientar ou recuperar o cliente.",
    actionLabel: "Ir para mensagens",
    actionType: "scroll_messages",
  });

  items.push({
    label: "Automação",
    status: input.data.nextAutomationJob ? "ok" : "attention",
    title: input.data.nextAutomationJob
      ? "Automação prevista"
      : "Sem automação futura",
    description: input.data.nextAutomationJob
      ? "Há continuidade operacional planejada para esta jornada."
      : "Ainda não existe próximo job para sustentar a experiência.",
    actionLabel: "Ir para automações",
    actionType: "scroll_automation",
  });

  items.push({
    label: "Recursos",
    status: input.data.allocations.length > 0 ? "ok" : "attention",
    title:
      input.data.allocations.length > 0
        ? "Recursos alocados"
        : "Sem recursos alocados",
    description:
      input.data.allocations.length > 0
        ? "A execução já possui recursos previstos."
        : "Ainda não há recursos vinculados a este atendimento.",
    actionLabel: "Ir para recursos",
    actionType: "scroll_resources",
  });

  items.push({
    label: "Continuidade",
    status:
      input.relatedBookingLinks.newBookingId ||
      input.relatedBookingLinks.sourceBookingId
        ? "ok"
        : status === "CANCELLED"
          ? "attention"
          : "ok",
    title: input.relatedBookingLinks.newBookingId
      ? "Gerou novo booking"
      : input.relatedBookingLinks.sourceBookingId
        ? "Veio de retomada"
        : status === "CANCELLED"
          ? "Sem retomada ainda"
          : "Jornada contínua",
    description: input.relatedBookingLinks.newBookingId
      ? "Este booking já gerou continuidade para um novo atendimento."
      : input.relatedBookingLinks.sourceBookingId
        ? "Este booking faz parte de uma recuperação comercial."
        : status === "CANCELLED"
          ? "Vale avaliar retomada para não perder a oportunidade."
          : "Não há ruptura relevante na continuidade da jornada.",
    actionLabel: input.relatedBookingLinks.newBookingId
      ? "Ver novo booking"
      : input.relatedBookingLinks.sourceBookingId
        ? "Ver booking de origem"
        : status === "CANCELLED"
          ? "Retomar atendimento"
          : undefined,
    actionType: input.relatedBookingLinks.newBookingId
      ? "open_new_booking"
      : input.relatedBookingLinks.sourceBookingId
        ? "open_source_booking"
        : status === "CANCELLED"
          ? "open_recreate"
          : undefined,
  });

  return items;
}

function getJourneyScoreClasses(tone: JourneyScore["tone"]) {
  switch (tone) {
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "attention":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "critical":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

function getJourneyScoreBarClasses(tone: JourneyScore["tone"]) {
  switch (tone) {
    case "ok":
      return "bg-emerald-500";
    case "attention":
      return "bg-amber-500";
    case "critical":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}
function buildJourneyScore(input: {
  data: BookingJourneyResponse;
  relatedBookingLinks: {
    newBookingId: string | null;
    sourceBookingId: string | null;
  };
}): JourneyScoreDetails {
  const status = input.data.booking.status?.toUpperCase?.() ?? "";
  const breakdown: JourneyScoreBreakdownItem[] = [];

  let score = 100;

  if (status === "CONFIRMED") {
    breakdown.push({
      label: "Status confirmado",
      impact: 0,
      status: "positive",
      description: "O booking está operacionalmente pronto para acontecer.",
    });
  } else if (status === "COMPLETED") {
    breakdown.push({
      label: "Status concluído",
      impact: 0,
      status: "positive",
      description: "O atendimento já foi finalizado com sucesso operacional.",
    });
  } else if (status === "PENDING") {
    score -= 15;
    breakdown.push({
      label: "Status pendente",
      impact: -15,
      status: "negative",
      description: "O booking ainda depende de confirmação ou consolidação.",
    });
  } else if (status === "CANCELLED") {
    score -= 45;
    breakdown.push({
      label: "Status cancelado",
      impact: -45,
      status: "negative",
      description: "O fluxo principal foi interrompido e pede ação comercial.",
    });
  } else {
    score -= 10;
    breakdown.push({
      label: "Status não mapeado",
      impact: -10,
      status: "neutral",
      description: "O estado atual precisa ser revisado manualmente.",
    });
  }

  if (input.data.lastMessage) {
    breakdown.push({
      label: "Comunicação registrada",
      impact: 0,
      status: "positive",
      description: "Existe histórico recente de comunicação com o cliente.",
    });
  } else {
    score -= 15;
    breakdown.push({
      label: "Sem comunicação",
      impact: -15,
      status: "negative",
      description: "Ainda não há mensagem vinculada à jornada.",
    });
  }

  if (input.data.nextAutomationJob) {
    breakdown.push({
      label: "Automação futura",
      impact: 0,
      status: "positive",
      description: "Existe continuidade operacional planejada.",
    });
  } else {
    score -= 10;
    breakdown.push({
      label: "Sem automação futura",
      impact: -10,
      status: "negative",
      description: "Não há próximo job para sustentar a experiência.",
    });
  }

  if (input.data.allocations.length > 0) {
    breakdown.push({
      label: "Recursos alocados",
      impact: 0,
      status: "positive",
      description: "Os recursos necessários já estão previstos.",
    });
  } else {
    score -= 15;
    breakdown.push({
      label: "Sem recursos alocados",
      impact: -15,
      status: "negative",
      description: "Ainda não há recursos vinculados ao atendimento.",
    });
  }

  const hasContinuity =
    Boolean(input.relatedBookingLinks.newBookingId) ||
    Boolean(input.relatedBookingLinks.sourceBookingId);

  if (status === "CANCELLED" && !hasContinuity) {
    score -= 10;
    breakdown.push({
      label: "Sem continuidade",
      impact: -10,
      status: "negative",
      description: "O cancelamento ainda não gerou retomada ou novo booking.",
    });
  } else {
    breakdown.push({
      label: "Continuidade preservada",
      impact: 0,
      status: "positive",
      description: "A jornada mantém ou recuperou sua continuidade.",
    });
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let scoreResult: JourneyScore;

  if (score >= 90) {
    scoreResult = {
      score,
      label: "Saudável",
      tone: "ok",
      summary:
        "A jornada está bem estruturada, com boa base operacional e continuidade.",
    };
  } else if (score >= 70) {
    scoreResult = {
      score,
      label: "Atenção",
      tone: "attention",
      summary:
        "A jornada está funcional, mas ainda há pontos que merecem acompanhamento.",
    };
  } else {
    scoreResult = {
      score,
      label: "Crítico",
      tone: "critical",
      summary:
        "A jornada precisa de ação para evitar perda operacional ou comercial.",
    };
  }
  let nextBestAction =
    "Monitorar a jornada e manter a consistência operacional.";
  let nextBestActionLabel: JourneyScoreDetails["nextBestActionLabel"];
  let nextBestActionType: JourneyScoreDetails["nextBestActionType"];

  if (status === "PENDING") {
    nextBestAction = "Confirmar o booking para consolidar a jornada.";
    nextBestActionLabel = "Confirmar booking";
    nextBestActionType = "confirm_booking";
  } else if (!input.data.lastMessage) {
    nextBestAction = "Iniciar comunicação com o cliente.";
    nextBestActionLabel = "Ir para mensagens";
    nextBestActionType = "scroll_messages";
  } else if (!input.data.nextAutomationJob) {
    nextBestAction = "Planejar a próxima automação da jornada.";
    nextBestActionLabel = "Ir para automações";
    nextBestActionType = "scroll_automation";
  } else if (input.data.allocations.length === 0) {
    nextBestAction = "Garantir recursos para execução do atendimento.";
    nextBestActionLabel = "Ir para recursos";
    nextBestActionType = "scroll_resources";
  } else if (status === "CANCELLED" && !hasContinuity) {
    nextBestAction = "Retomar o atendimento para recuperar a oportunidade.";
    nextBestActionLabel = "Retomar atendimento";
    nextBestActionType = "open_recreate";
  }

  return {
    score: scoreResult,
    breakdown,
    nextBestAction,
    nextBestActionLabel,
    nextBestActionType,
  };
}
function getJourneyBreakdownClasses(
  status: JourneyScoreBreakdownItem["status"],
) {
  switch (status) {
    case "positive":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "negative":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "neutral":
      return "border-slate-200 bg-slate-50 text-slate-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}
function getOpportunityClasses(tone: JourneyOpportunity["tone"]) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}
function buildJourneyOpportunities(input: {
  data: BookingJourneyResponse;
  relatedBookingLinks: {
    newBookingId: string | null;
    sourceBookingId: string | null;
  };
}) {
  const status = input.data.booking.status?.toUpperCase?.() ?? "";
  const items: JourneyOpportunity[] = [];

  if (status === "CANCELLED" && !input.relatedBookingLinks.newBookingId) {
    items.push({
      id: "cancelled-without-recovery",
      title: "Cancelamento sem retomada",
      description:
        "Este booking foi cancelado e ainda não gerou novo atendimento. Existe oportunidade clara de recuperação comercial.",
      tone: "danger",
      actionLabel: "Retomar atendimento",
      actionType: "open_recreate",
    });
  }

  if (status === "PENDING") {
    items.push({
      id: "pending-confirmation",
      title: "Booking ainda não consolidado",
      description:
        "O atendimento continua pendente. Confirmar esse booking aumenta previsibilidade e reduz risco de perda.",
      tone: "warning",
      actionLabel: "Confirmar booking",
      actionType: "confirm_booking",
    });
  }

  if (!input.data.lastMessage) {
    items.push({
      id: "missing-communication",
      title: "Cliente sem comunicação registrada",
      description:
        "Ainda não há mensagem vinculada à jornada. Isso reduz percepção de cuidado e pode aumentar ausência ou cancelamento.",
      tone: "warning",
      actionLabel: "Ir para mensagens",
      actionType: "scroll_messages",
    });
  }

  if (
    (status === "CONFIRMED" || status === "PENDING") &&
    !input.data.nextAutomationJob
  ) {
    items.push({
      id: "missing-automation",
      title: "Sem continuidade automatizada",
      description:
        "Não existe automação futura para sustentar a jornada. Há espaço para reforçar confirmação, lembrete ou follow-up.",
      tone: "default",
      actionLabel: "Ir para automações",
      actionType: "scroll_automation",
    });
  }

  if (
    (status === "CONFIRMED" || status === "PENDING") &&
    input.data.allocations.length === 0
  ) {
    items.push({
      id: "missing-resources",
      title: "Recursos ainda não previstos",
      description:
        "O atendimento está ativo, mas ainda não há recursos alocados. Isso pode impactar execução e qualidade percebida.",
      tone: "warning",
      actionLabel: "Ir para recursos",
      actionType: "scroll_resources",
    });
  }

  if (status === "COMPLETED" && !input.data.nextAutomationJob) {
    items.push({
      id: "completed-without-followup",
      title: "Pós-atendimento sem continuidade",
      description:
        "O atendimento foi concluído, mas não há ação futura planejada. Existe oportunidade de follow-up e valorização do cliente.",
      tone: "success",
      actionLabel: "Ir para automações",
      actionType: "scroll_automation",
    });
  }

  return items;
}
function getInsightClasses(tone: JourneyInsight["tone"]) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

function buildJourneyInsights(input: {
  data: BookingJourneyResponse;
  relatedBookingLinks: {
    newBookingId: string | null;
    sourceBookingId: string | null;
  };
}) {
  const status = input.data.booking.status?.toUpperCase?.() ?? "";
  const insights: JourneyInsight[] = [];

  if (status === "PENDING" && !input.data.lastMessage) {
    insights.push({
      id: "pending-without-message",
      title: "Risco de baixa previsibilidade",
      description:
        "O booking ainda está pendente e não há comunicação registrada. Isso pode aumentar dúvida do cliente e reduzir comparecimento.",
      tone: "warning",
    });
  }

  if (status === "CONFIRMED" && !input.data.nextAutomationJob) {
    insights.push({
      id: "confirmed-without-automation",
      title: "Confirmação sem continuidade futura",
      description:
        "O atendimento está confirmado, mas ainda não há ação futura planejada. Existe espaço para reforçar lembrete, preparo ou follow-up.",
      tone: "info",
    });
  }

  if (status === "CANCELLED" && !input.relatedBookingLinks.newBookingId) {
    insights.push({
      id: "cancelled-without-recovery",
      title: "Perda comercial em aberto",
      description:
        "Este cancelamento ainda não gerou retomada. A jornada continua com potencial de recuperação.",
      tone: "danger",
    });
  }

  if (status === "COMPLETED" && !input.data.nextAutomationJob) {
    insights.push({
      id: "completed-without-post-action",
      title: "Pós-atendimento subaproveitado",
      description:
        "O atendimento foi concluído, mas ainda não há continuidade planejada. Há boa oportunidade para valorização e relacionamento.",
      tone: "success",
    });
  }

  if (
    input.data.allocations.length === 0 &&
    (status === "PENDING" || status === "CONFIRMED")
  ) {
    insights.push({
      id: "active-without-resources",
      title: "Execução ainda frágil",
      description:
        "O booking está ativo, mas sem recursos alocados. Isso pode comprometer fluidez e qualidade operacional.",
      tone: "warning",
    });
  }

  if (
    input.data.lastMessage &&
    input.data.nextAutomationJob &&
    input.data.allocations.length > 0 &&
    (status === "CONFIRMED" || status === "COMPLETED")
  ) {
    insights.push({
      id: "healthy-journey",
      title: "Jornada bem estruturada",
      description:
        "A combinação de comunicação, automação e preparação operacional indica uma jornada madura e consistente.",
      tone: "success",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "no-critical-insight",
      title: "Jornada sem alertas relevantes",
      description:
        "No momento, não há sinais fortes de risco ou oportunidade urgente além do acompanhamento normal.",
      tone: "default",
    });
  }

  return insights;
}

function getSuggestedCommunicationClasses(
  tone: JourneySuggestedCommunication["tone"],
) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}
function buildJourneySuggestedCommunications(input: {
  data: BookingJourneyResponse;
  firstItem: BookingJourneyResponse["items"][number] | null;
  relatedBookingLinks: {
    newBookingId: string | null;
    sourceBookingId: string | null;
  };
}) {
  const status = input.data.booking.status?.toUpperCase?.() ?? "";
  const clientName = input.data.client.name?.trim() || "cliente";
  const serviceName = input.firstItem?.serviceName?.trim() || "atendimento";
  const dateLabel = formatDate(input.data.booking.startTime);
  const timeLabel = formatTime(input.data.booking.startTime);

  const items: JourneySuggestedCommunication[] = [];

  if (status === "PENDING" && !input.data.lastMessage) {
    items.push({
      id: "pending-confirmation-message",
      title: "Mensagem de confirmação inicial",
      description:
        "Ideal para iniciar a conversa, reforçar previsibilidade e reduzir incerteza do cliente.",
      message: `Olá, ${clientName}! Passando para confirmar seu ${serviceName}, previsto para ${dateLabel} às ${timeLabel}. Se precisar de qualquer orientação antes do atendimento, estou à disposição.`,
      tone: "warning",
      category: "pre",
    });
  }

  if (status === "CONFIRMED" && !input.data.nextAutomationJob) {
    items.push({
      id: "confirmed-reminder-message",
      title: "Mensagem de lembrete e preparo",
      description:
        "Boa opção para reforçar presença, preparo e percepção de cuidado antes do atendimento.",
      message: `Olá, ${clientName}! Seu ${serviceName} está confirmado para ${dateLabel} às ${timeLabel}. Qualquer dúvida antes do atendimento, pode me chamar por aqui.`,
      tone: "info",
      category: "reminder",
    });
  }

  if (status === "CANCELLED" && !input.relatedBookingLinks.newBookingId) {
    items.push({
      id: "cancelled-recovery-message",
      title: "Mensagem de reconquista",
      description:
        "Ajuda a retomar o relacionamento e abrir espaço para um novo horário.",
      message: `Olá, ${clientName}! Vi que seu ${serviceName} acabou não acontecendo. Se quiser, posso te ajudar a encontrar um novo horário que fique melhor para você.`,
      tone: "danger",
      category: "recovery",
    });
  }

  if (status === "COMPLETED" && !input.data.nextAutomationJob) {
    items.push({
      id: "completed-followup-message",
      title: "Mensagem de pós-atendimento",
      description:
        "Boa para valorizar a experiência, manter proximidade e abrir espaço para retorno.",
      message: `Olá, ${clientName}! Espero que sua experiência com o ${serviceName} tenha sido excelente. Seu retorno é muito importante para continuarmos oferecendo um atendimento cada vez melhor.`,
      tone: "success",
      category: "post",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "general-relationship-message",
      title: "Mensagem de relacionamento",
      description:
        "Sugestão genérica para manter proximidade e percepção de cuidado.",
      message: `Olá, ${clientName}! Estou passando para acompanhar sua jornada com nosso atendimento. Sempre que precisar, estou à disposição para ajudar.`,
      tone: "default",
      category: "pre",
    });
  }

  return items;
}

export default function BookingJourneyPage({ params }: Props) {
  const router = useRouter();
  const [data, setData] = useState<BookingJourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingType, setSendingType] = useState<"pre" | "post" | null>(null);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [recreateOpen, setRecreateOpen] = useState(false);
  const [recreateDate, setRecreateDate] = useState("");
  const [recreateSlot, setRecreateSlot] = useState("");
  const [recreateReason, setRecreateReason] = useState("");
  const [recreating, setRecreating] = useState(false);

  const serviceSectionRef = useRef<HTMLDivElement | null>(null);
  const resourcesSectionRef = useRef<HTMLDivElement | null>(null);
  const messagesSectionRef = useRef<HTMLDivElement | null>(null);
  const automationSectionRef = useRef<HTMLDivElement | null>(null);

  async function loadJourney(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

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
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadJourney();
  }, [params.id]);

  const firstItem = useMemo(() => data?.items[0] ?? null, [data]);

  async function handleSend(type: "pre" | "post") {
    if (!data) return;

    try {
      setSendingType(type);

      await sendSuggestedMessage({
        bookingId: data.booking.id,
        type,
      });

      await loadJourney({ silent: true });
      alert("Mensagem enviada para o fluxo do SISAG.");
    } catch (err: any) {
      alert(err?.message ?? "Erro ao enviar mensagem.");
    } finally {
      setSendingType(null);
    }
  }

  function openRescheduleModal() {
    if (!data) return;

    const current = new Date(data.booking.startTime);
    const dateIso = Number.isNaN(current.getTime())
      ? ""
      : new Date(current.getTime() - current.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10);

    setRescheduleDate(dateIso);
    setRescheduleSlot("");
    setRescheduleReason("");
    setRescheduleOpen(true);
  }

  function closeRescheduleModal() {
    setRescheduleOpen(false);
    setRescheduleDate("");
    setRescheduleSlot("");
    setRescheduleReason("");
  }

  function scrollToSection(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleQuickSignalClick(signal: BookingQuickSignal) {
    if (!signal.actionType) return;

    switch (signal.actionType) {
      case "scroll_service":
        scrollToSection(serviceSectionRef);
        return;

      case "scroll_resources":
        scrollToSection(resourcesSectionRef);
        return;

      case "scroll_messages":
        scrollToSection(messagesSectionRef);
        return;

      case "scroll_automation":
        scrollToSection(automationSectionRef);
        return;

      case "open_new_booking":
        if (relatedBookingLinks.newBookingId) {
          router.push(
            `/admin/bookings/${relatedBookingLinks.newBookingId}/journey`,
          );
        }
        return;

      case "open_source_booking":
        if (relatedBookingLinks.sourceBookingId) {
          router.push(
            `/admin/bookings/${relatedBookingLinks.sourceBookingId}/journey`,
          );
        }
        return;
    }
  }

  async function handleConfirmReschedule() {
    if (!data) return;

    if (!rescheduleDate || !rescheduleSlot) {
      alert("Selecione a nova data e o novo horário.");
      return;
    }

    try {
      setRescheduling(true);

      const newStartTime = zonedDateTimeToUtcISOString(
        rescheduleDate,
        rescheduleSlot,
      );

      const res = await fetch(
        `/api/v1/bookings/${data.booking.id}/reschedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newStartTime,
            reason: rescheduleReason.trim() || null,
          }),
        },
      );

      const response = await res.json().catch(() => null);

      if (!res.ok || !response?.ok) {
        alert(
          response?.message ??
            response?.error ??
            "Não foi possível reagendar o booking.",
        );
        return;
      }

      alert("Booking reagendado com sucesso.");
      closeRescheduleModal();
      await loadJourney({ silent: true });
    } catch {
      alert("Erro ao reagendar booking.");
    } finally {
      setRescheduling(false);
    }
  }

  async function handleConfirmBooking() {
    if (!data) return;

    try {
      setConfirming(true);

      const res = await fetch(`/api/v1/bookings/${data.booking.id}/confirm`, {
        method: "POST",
      });

      const response = await res.json().catch(() => null);

      if (!res.ok || !response?.ok) {
        alert(
          response?.message ?? response?.error ?? "Não foi possível confirmar.",
        );
        return;
      }

      alert("Booking confirmado com sucesso.");
      await loadJourney({ silent: true });
    } catch {
      alert("Erro ao confirmar booking.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleCancelBooking() {
    if (!data) return;

    const confirmed = confirm(
      "Deseja cancelar este booking? Essa ação libera os recursos alocados.",
    );

    if (!confirmed) return;

    try {
      setCancelling(true);

      const res = await fetch(`/api/v1/bookings/${data.booking.id}/cancel`, {
        method: "POST",
      });

      const response = await res.json().catch(() => null);

      if (!res.ok || !response?.ok) {
        alert(
          response?.message ?? response?.error ?? "Não foi possível cancelar.",
        );
        return;
      }

      alert("Booking cancelado com sucesso.");
      await loadJourney({ silent: true });
    } catch {
      alert("Erro ao cancelar booking.");
    } finally {
      setCancelling(false);
    }
  }

  function openRecreateModal() {
    if (!data) return;

    const current = new Date();
    const dateIso = new Date(
      current.getTime() - current.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 10);

    setRecreateDate(dateIso);
    setRecreateSlot("");
    setRecreateReason("");
    setRecreateOpen(true);
  }

  function closeRecreateModal() {
    setRecreateOpen(false);
    setRecreateDate("");
    setRecreateSlot("");
    setRecreateReason("");
  }

  async function handleConfirmRecreate() {
    if (!data) return;

    if (!recreateDate || !recreateSlot) {
      alert("Selecione a nova data e o novo horário.");
      return;
    }

    try {
      setRecreating(true);

      const { zonedDateTimeToUtcISOString } = await import("@/lib/time");
      const newStartTime = zonedDateTimeToUtcISOString(
        recreateDate,
        recreateSlot,
      );

      const res = await fetch(`/api/v1/bookings/${data.booking.id}/recreate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newStartTime,
          reason: recreateReason.trim() || null,
        }),
      });

      const response = await res.json().catch(() => null);

      if (!res.ok || !response?.ok) {
        alert(
          response?.message ??
            response?.error ??
            "Não foi possível criar um novo booking.",
        );
        return;
      }

      alert("Novo booking criado com sucesso.");
      router.push(`/admin/bookings/${response.newBookingId}/journey`);
    } catch {
      alert("Erro ao criar novo booking.");
    } finally {
      setRecreating(false);
    }
  }

  function handleJourneyHealthAction(item: JourneyHealthItem) {
    switch (item.actionType) {
      case "scroll_messages":
        scrollToSection(messagesSectionRef);
        return;

      case "scroll_automation":
        scrollToSection(automationSectionRef);
        return;

      case "scroll_resources":
        scrollToSection(resourcesSectionRef);
        return;

      case "open_recreate":
        openRecreateModal();
        return;

      case "open_new_booking":
        if (relatedBookingLinks.newBookingId) {
          router.push(
            `/admin/bookings/${relatedBookingLinks.newBookingId}/journey`,
          );
        }
        return;

      case "open_source_booking":
        if (relatedBookingLinks.sourceBookingId) {
          router.push(
            `/admin/bookings/${relatedBookingLinks.sourceBookingId}/journey`,
          );
        }
        return;

      case "open_reschedule":
        openRescheduleModal();
        return;

      case "confirm_booking":
        handleConfirmBooking();
        return;

      default:
        return;
    }
  }

  function handleNextBestAction() {
    switch (journeyScoreDetails.nextBestActionType) {
      case "confirm_booking":
        handleConfirmBooking();
        return;

      case "scroll_messages":
        scrollToSection(messagesSectionRef);
        return;

      case "scroll_automation":
        scrollToSection(automationSectionRef);
        return;

      case "scroll_resources":
        scrollToSection(resourcesSectionRef);
        return;

      case "open_recreate":
        openRecreateModal();
        return;

      default:
        return;
    }
  }
  function handleOpportunityAction(item: JourneyOpportunity) {
    switch (item.actionType) {
      case "scroll_messages":
        scrollToSection(messagesSectionRef);
        return;

      case "scroll_automation":
        scrollToSection(automationSectionRef);
        return;

      case "scroll_resources":
        scrollToSection(resourcesSectionRef);
        return;

      case "open_recreate":
        openRecreateModal();
        return;

      case "confirm_booking":
        handleConfirmBooking();
        return;

      case "open_reschedule":
        openRescheduleModal();
        return;

      default:
        return;
    }
  }
  function openSuggestedCommunication(message: string) {
    const link = buildWhatsAppLink(data?.client.phone, message);

    if (!link) {
      alert("Telefone do cliente não disponível para abrir no WhatsApp.");
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  }

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

  const preWhatsAppLink = buildWhatsAppLink(
    data.client.phone,
    data.suggestedPreMessage,
  );
  const postWhatsAppLink = buildWhatsAppLink(
    data.client.phone,
    data.suggestedPostMessage,
  );
  const timeline = buildTimeline(data);
  const recommendedAction = getRecommendedAction(data);

  const rescheduleEvents = getRescheduleEvents(data.events);
  const lastRescheduleEvent = getLastRescheduleEvent(data.events);
  const lastRescheduleData = lastRescheduleEvent
    ? getReschedulePayload(lastRescheduleEvent.payload)
    : null;
  const relatedBookingLinks = getRelatedBookingLinks(data.events);
  const bookingStatus = getBookingStatus(data.booking.status);

  const canConfirm = bookingStatus === "PENDING";
  const canCancel =
    bookingStatus === "PENDING" || bookingStatus === "CONFIRMED";
  const canReschedule =
    bookingStatus === "PENDING" || bookingStatus === "CONFIRMED";
  const canRecreate = bookingStatus === "CANCELLED";
  const isCompleted = bookingStatus === "COMPLETED";
  const quickSignals = buildQuickSignals({
    data,
    firstItem,
    relatedBookingLinks,
  });
  const journeyHealth = buildJourneyHealth({
    data,
    relatedBookingLinks,
  });
  const journeyOpportunities = buildJourneyOpportunities({
    data,
    relatedBookingLinks,
  });
  const journeyInsights = buildJourneyInsights({
    data,
    relatedBookingLinks,
  });
  const journeySuggestedCommunications = buildJourneySuggestedCommunications({
    data,
    firstItem,
    relatedBookingLinks,
  });

  const journeyScoreDetails = buildJourneyScore({
    data,
    relatedBookingLinks,
  });
  const journeyScore = journeyScoreDetails.score;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {canConfirm && (
            <Button
              type="button"
              onClick={handleConfirmBooking}
              disabled={confirming}
            >
              {confirming ? "Confirmando..." : "Confirmar booking"}
            </Button>
          )}

          {canReschedule && (
            <Button
              type="button"
              variant="secondary"
              onClick={openRescheduleModal}
            >
              Reagendar booking
            </Button>
          )}

          {canCancel && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={cancelling}
            >
              {cancelling ? "Cancelando..." : "Cancelar booking"}
            </Button>
          )}

          {canRecreate && (
            <Button type="button" variant="default" onClick={openRecreateModal}>
              Retomar atendimento
            </Button>
          )}

          {bookingStatus === "CANCELLED" &&
            relatedBookingLinks.newBookingId && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(
                    `/admin/bookings/${relatedBookingLinks.newBookingId}/journey`,
                  )
                }
              >
                Ver novo booking
              </Button>
            )}

          {isCompleted && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                window.scrollTo({
                  top: document.body.scrollHeight,
                  behavior: "smooth",
                })
              }
            >
              Ver pós-atendimento
            </Button>
          )}
        </div>

        {refreshing && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            Atualizando jornada...
          </div>
        )}

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

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div
              className={`rounded-2xl border p-5 ${getJourneyScoreClasses(
                journeyScore.tone,
              )}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    Score geral da jornada
                  </p>

                  <div className="mt-2 flex items-end gap-3">
                    <p className="text-4xl font-bold">{journeyScore.score}</p>
                    <p className="pb-1 text-sm font-medium opacity-80">/ 100</p>
                  </div>

                  <p className="mt-2 text-lg font-semibold">
                    {journeyScore.label}
                  </p>

                  <p className="mt-2 text-sm opacity-80">
                    {journeyScore.summary}
                  </p>
                </div>

                <div className="w-full max-w-md">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium opacity-80">
                    <span>Crítico</span>
                    <span>Atenção</span>
                    <span>Saudável</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white/60">
                    <div
                      className={`h-full rounded-full transition-all ${getJourneyScoreBarClasses(
                        journeyScore.tone,
                      )}`}
                      style={{ width: `${journeyScore.score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Como essa nota foi formada</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              {journeyScoreDetails.breakdown.map((item) => (
                <div
                  key={`${item.label}-${item.impact}`}
                  className={`rounded-2xl border p-4 ${getJourneyBreakdownClasses(
                    item.status,
                  )}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-2 text-sm opacity-80">
                        {item.description}
                      </p>
                    </div>

                    <div className="shrink-0 text-sm font-bold">
                      {item.impact === 0 ? "OK" : item.impact}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                Melhor próxima ação
              </p>

              <p className="mt-2 text-base font-semibold">
                {journeyScoreDetails.nextBestAction}
              </p>

              {journeyScoreDetails.nextBestActionLabel &&
                journeyScoreDetails.nextBestActionType && (
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleNextBestAction}
                    >
                      {journeyScoreDetails.nextBestActionLabel}
                    </Button>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Resumo operacional</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {quickSignals.map((signal) => {
                const Icon = signal.icon;
                const clickable = Boolean(signal.actionType);

                return (
                  <button
                    key={`${signal.label}-${signal.value}`}
                    type="button"
                    onClick={() => handleQuickSignalClick(signal)}
                    disabled={!clickable}
                    className={`rounded-2xl border p-4 text-left transition ${
                      clickable ? "hover:shadow-md hover:scale-[1.01]" : ""
                    } ${getQuickSignalClasses(signal.tone)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl border border-white/60 bg-white/70 p-2 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                          {signal.label}
                        </p>

                        <p className="mt-2 text-lg font-semibold">
                          {signal.value}
                        </p>

                        {signal.helper && (
                          <p className="mt-2 text-sm opacity-80">
                            {signal.helper}
                          </p>
                        )}

                        {clickable && (
                          <p className="mt-3 text-xs font-medium opacity-70">
                            Clique para abrir
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Saúde da jornada</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {journeyHealth.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border p-4 ${getJourneyHealthClasses(
                    item.status,
                  )}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-1">
                      <span
                        className={`block h-3 w-3 rounded-full ${getJourneyHealthDotClasses(
                          item.status,
                        )}`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        {item.label}
                      </p>

                      <p className="mt-2 text-lg font-semibold">{item.title}</p>

                      <p className="mt-2 text-sm opacity-80">
                        {item.description}
                      </p>

                      {item.actionLabel && item.actionType && (
                        <div className="mt-4">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleJourneyHealthAction(item)}
                          >
                            {item.actionLabel}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Oportunidades comerciais</CardTitle>
          </CardHeader>

          <CardContent>
            {journeyOpportunities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Nenhuma oportunidade crítica identificada no momento. A jornada
                está bem encaminhada.
              </div>
            ) : (
              <div className="space-y-4">
                {journeyOpportunities.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 ${getOpportunityClasses(
                      item.tone,
                    )}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-base font-semibold">{item.title}</p>
                        <p className="mt-2 text-sm opacity-80">
                          {item.description}
                        </p>
                      </div>

                      {item.actionLabel && item.actionType && (
                        <div className="shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpportunityAction(item)}
                          >
                            {item.actionLabel}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Insights automáticos</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 xl:grid-cols-2">
              {journeyInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`rounded-2xl border p-4 ${getInsightClasses(
                    insight.tone,
                  )}`}
                >
                  <p className="text-base font-semibold">{insight.title}</p>
                  <p className="mt-2 text-sm opacity-80">
                    {insight.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Sugestões de comunicação</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {journeySuggestedCommunications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 ${getSuggestedCommunicationClasses(
                    item.tone,
                  )}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold">{item.title}</p>
                      <p className="mt-2 text-sm opacity-80">
                        {item.description}
                      </p>

                      <div className="mt-4 rounded-xl border border-white/50 bg-white/50 p-4 text-sm leading-6">
                        {item.message}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => copyToClipboard(item.message)}
                      >
                        Copiar mensagem
                      </Button>

                      <Button
                        type="button"
                        onClick={() => openSuggestedCommunication(item.message)}
                      >
                        Abrir no WhatsApp
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {(relatedBookingLinks.newBookingId ||
          relatedBookingLinks.sourceBookingId) && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Relação entre bookings</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2">
              {relatedBookingLinks.newBookingId && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-medium text-emerald-900">
                    Este booking gerou um novo atendimento
                  </p>
                  <p className="mt-2 text-sm text-emerald-700">
                    Novo booking: {relatedBookingLinks.newBookingId.slice(0, 8)}
                  </p>

                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/admin/bookings/${relatedBookingLinks.newBookingId}/journey`,
                        )
                      }
                    >
                      Ver novo booking
                    </Button>
                  </div>
                </div>
              )}

              {relatedBookingLinks.sourceBookingId && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <p className="text-sm font-medium text-sky-900">
                    Este booking veio de uma retomada
                  </p>
                  <p className="mt-2 text-sm text-sky-700">
                    Booking de origem:{" "}
                    {relatedBookingLinks.sourceBookingId.slice(0, 8)}
                  </p>

                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/admin/bookings/${relatedBookingLinks.sourceBookingId}/journey`,
                        )
                      }
                    >
                      Ver booking de origem
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {rescheduleEvents.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Histórico de reagendamentos</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Total de reagendamentos
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {rescheduleEvents.length}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">
                    Último horário anterior
                  </p>
                  <p className="mt-2 font-semibold text-amber-900">
                    {lastRescheduleData?.oldStartTime
                      ? formatDateTime(lastRescheduleData.oldStartTime)
                      : "Não identificado"}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">
                    Último novo horário
                  </p>
                  <p className="mt-2 font-semibold text-emerald-900">
                    {lastRescheduleData?.newStartTime
                      ? formatDateTime(lastRescheduleData.newStartTime)
                      : "Não identificado"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Último reagendamento registrado
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  {lastRescheduleEvent?.createdAt
                    ? formatDateTime(lastRescheduleEvent.createdAt)
                    : "Data não identificada"}
                </p>

                {lastRescheduleData?.reason && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Motivo
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {lastRescheduleData.reason}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div
              className={`rounded-2xl border p-4 ${getRecommendedActionClasses(
                recommendedAction.tone,
              )}`}
            >
              <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
                Próximo passo recomendado
              </p>

              <h3 className="mt-2 text-lg font-semibold">
                {recommendedAction.title}
              </h3>

              <p className="mt-2 text-sm leading-6 opacity-90">
                {recommendedAction.description}
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {recommendedAction.actionType === "send_pre" && (
                  <>
                    {data.suggestedPreMessage && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          copyToClipboard(data.suggestedPreMessage)
                        }
                        className="w-full sm:w-auto"
                      >
                        Copiar pré-atendimento
                      </Button>
                    )}

                    {preWhatsAppLink && (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <a
                          href={preWhatsAppLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir WhatsApp
                        </a>
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={() => handleSend("pre")}
                      disabled={sendingType === "pre"}
                      className="w-full sm:w-auto"
                    >
                      {sendingType === "pre"
                        ? "Enviando..."
                        : "Enviar pelo SISAG"}
                    </Button>
                  </>
                )}

                {recommendedAction.actionType === "send_post" && (
                  <>
                    {data.suggestedPostMessage && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          copyToClipboard(data.suggestedPostMessage)
                        }
                        className="w-full sm:w-auto"
                      >
                        Copiar pós-atendimento
                      </Button>
                    )}

                    {postWhatsAppLink && (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <a
                          href={postWhatsAppLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir WhatsApp
                        </a>
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={() => handleSend("post")}
                      disabled={sendingType === "post"}
                      className="w-full sm:w-auto"
                    >
                      {sendingType === "post"
                        ? "Enviando..."
                        : "Enviar pelo SISAG"}
                    </Button>
                  </>
                )}

                {recommendedAction.actionType === "open_pre" &&
                  preWhatsAppLink && (
                    <>
                      {data.suggestedPreMessage && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(data.suggestedPreMessage)
                          }
                          className="w-full sm:w-auto"
                        >
                          Copiar mensagem
                        </Button>
                      )}

                      <Button asChild className="w-full sm:w-auto">
                        <a
                          href={preWhatsAppLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir WhatsApp
                        </a>
                      </Button>
                    </>
                  )}

                {recommendedAction.actionType === "monitor" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      window.scrollTo({
                        top: document.body.scrollHeight,
                        behavior: "smooth",
                      })
                    }
                    className="w-full sm:w-auto"
                  >
                    Ver detalhes da jornada
                  </Button>
                )}
              </div>
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

        <div ref={serviceSectionRef} className="grid gap-4 xl:grid-cols-2">
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

          <div ref={resourcesSectionRef}>
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
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div ref={messagesSectionRef}>
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
          </div>

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
                  Ainda não há sessões de conversa registradas para este
                  cliente.
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
                data.events.map((event) => {
                  const rescheduleData =
                    event.type === "booking.rescheduled"
                      ? getReschedulePayload(event.payload)
                      : null;

                  const cancelledPayload =
                    event.type === "booking.cancelled" &&
                    isRecord(event.payload)
                      ? event.payload
                      : null;

                  return (
                    <div
                      key={event.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium text-slate-900">
                          {event.type === "booking.rescheduled"
                            ? "Booking reagendado"
                            : event.type === "booking.cancelled"
                              ? "Booking cancelado"
                              : event.type === "booking.recreated_origin"
                                ? "Retomada iniciada"
                                : event.type ===
                                    "booking.recreated_from_cancelled"
                                  ? "Booking retomado"
                                  : event.type}
                        </p>

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

                      {rescheduleData ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                              Antes
                            </p>
                            <p className="mt-2 text-sm font-medium text-amber-900">
                              {rescheduleData.oldStartTime
                                ? formatDateTime(rescheduleData.oldStartTime)
                                : "Horário anterior não identificado"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                              Depois
                            </p>
                            <p className="mt-2 text-sm font-medium text-emerald-900">
                              {rescheduleData.newStartTime
                                ? formatDateTime(rescheduleData.newStartTime)
                                : "Novo horário não identificado"}
                            </p>
                          </div>

                          {rescheduleData.reason && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Motivo
                              </p>
                              <p className="mt-2 text-sm text-slate-700">
                                {rescheduleData.reason}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : cancelledPayload ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                              Atendimento cancelado
                            </p>
                            <p className="mt-2 text-sm font-medium text-rose-900">
                              {typeof cancelledPayload.startTime === "string"
                                ? formatDateTime(cancelledPayload.startTime)
                                : "Horário não identificado"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Status anterior
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {typeof cancelledPayload.previousStatus ===
                              "string"
                                ? cancelledPayload.previousStatus
                                : "Não identificado"}
                            </p>
                          </div>

                          {typeof cancelledPayload.reason === "string" &&
                            cancelledPayload.reason.trim() && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Motivo
                                </p>
                                <p className="mt-2 text-sm text-slate-700">
                                  {cancelledPayload.reason}
                                </p>
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-slate-600">
                          {getEventDescription(event)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <div ref={automationSectionRef}>
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
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Timeline da jornada</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Ainda não há itens na timeline desta jornada.
              </div>
            ) : (
              <div className="space-y-4">
                {timeline.map((item, index) => {
                  const Icon = getTimelineIcon(item.kind);

                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full ${
                            item.kind === "event" &&
                            item.title === "Booking reagendado" &&
                            lastRescheduleEvent &&
                            item.id === `event-${lastRescheduleEvent.id}`
                              ? "bg-emerald-50 text-emerald-700"
                              : getTimelineIconClasses(item.kind)
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        {index < timeline.length - 1 && (
                          <div className="mt-2 w-px flex-1 bg-slate-200" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <p className="font-medium text-slate-900">
                              {item.title}
                            </p>

                            {item.kind === "event" &&
                              item.title === "Booking reagendado" &&
                              lastRescheduleEvent &&
                              item.id === `event-${lastRescheduleEvent.id}` && (
                                <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                  Mais recente
                                </span>
                              )}
                          </div>

                          {item.status && (
                            <span
                              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                                item.status,
                              )}`}
                            >
                              {item.status}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                          {item.description}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          {formatDateTime(item.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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

      <Modal
        open={rescheduleOpen}
        onClose={closeRescheduleModal}
        title="Reagendar booking"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="rescheduleDate">Nova data</Label>
            <Input
              id="rescheduleDate"
              type="date"
              min={new Date().toISOString().substring(0, 10)}
              value={rescheduleDate}
              onChange={(e) => {
                setRescheduleDate(e.target.value);
                setRescheduleSlot("");
              }}
            />
          </div>

          <div className="space-y-3">
            {data.items[0]?.serviceId &&
            data.rescheduleTarget?.professionalId ? (
              <ScheduleSlotPicker
                professionalId={data.rescheduleTarget.professionalId}
                companyId={data.booking.companyId}
                serviceId={data.items[0].serviceId}
                durationMinutes={data.items[0].durationMinutes}
                date={rescheduleDate}
                selectedSlot={rescheduleSlot}
                onSelect={(slot) => setRescheduleSlot(slot)}
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Profissional principal não identificado para recalcular
                disponibilidade.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rescheduleReason">Motivo (opcional)</Label>
            <Input
              id="rescheduleReason"
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="Ex.: Cliente pediu outro horário"
            />
          </div>

          {rescheduleSlot && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              Novo horário selecionado: {rescheduleDate} às {rescheduleSlot}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeRescheduleModal}
            >
              Fechar
            </Button>

            <Button
              type="button"
              onClick={handleConfirmReschedule}
              disabled={!rescheduleSlot || !rescheduleDate || rescheduling}
            >
              {rescheduling ? "Reagendando..." : "Confirmar reagendamento"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={recreateOpen}
        onClose={closeRecreateModal}
        title="Retomar atendimento"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="recreateDate">Nova data</Label>
            <Input
              id="recreateDate"
              type="date"
              min={new Date().toISOString().substring(0, 10)}
              value={recreateDate}
              onChange={(e) => {
                setRecreateDate(e.target.value);
                setRecreateSlot("");
              }}
            />
          </div>

          <div className="space-y-3">
            {data.items[0]?.serviceId &&
            data.rescheduleTarget?.professionalId ? (
              <ScheduleSlotPicker
                professionalId={data.rescheduleTarget.professionalId}
                companyId={data.booking.companyId}
                serviceId={data.items[0].serviceId}
                durationMinutes={data.items[0].durationMinutes}
                date={recreateDate}
                selectedSlot={recreateSlot}
                onSelect={(slot) => setRecreateSlot(slot)}
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Profissional principal não identificado para recriar a agenda.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recreateReason">Observação (opcional)</Label>
            <Input
              id="recreateReason"
              value={recreateReason}
              onChange={(e) => setRecreateReason(e.target.value)}
              placeholder="Ex.: Cliente aceitou novo horário"
            />
          </div>

          {recreateSlot && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              Novo atendimento selecionado: {recreateDate} às {recreateSlot}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeRecreateModal}
            >
              Fechar
            </Button>

            <Button
              type="button"
              onClick={handleConfirmRecreate}
              disabled={!recreateSlot || !recreateDate || recreating}
            >
              {recreating ? "Criando..." : "Criar novo booking"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
