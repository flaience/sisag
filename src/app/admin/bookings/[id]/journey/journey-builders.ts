//src/app/admin/bookings/[id]/journey/journey-builders.ts

import {
  Activity,
  Bot,
  History,
  MessageCircleMore,
  UserRound,
  Wrench,
} from "lucide-react";

import type {
  BookingJourneyResponse,
  BookingQuickSignal,
  TimelineItem,
  JourneyHealthItem,
} from "./types";

import { formatDate, formatDateTime, formatTime } from "@/lib/time";

import type { LucideIcon } from "lucide-react";
import { isRecord } from "./journey-utils";
import { JourneySuggestedCommunicationsPanel } from "./JourneySuggestedCommunicationsPanel";
import type { JourneyInsight } from "./types";
import type { JourneyOpportunity } from "./types";

type RecommendedAction = {
  title: string;
  description: string;
  tone: "default" | "warning" | "success";
  actionType: "send_pre" | "send_post" | "open_pre" | "monitor";
};
type JourneySuggestedCommunication = {
  id: string;
  title: string;
  description: string;
  message: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
  category: "pre" | "recovery" | "reminder" | "post";
};

type JourneyScoreBreakdownItem = {
  label: string;
  impact: number;
  status: "positive" | "neutral" | "negative";
  description: string;
};

type JourneyScore = {
  score: number;
  label: "Saudável" | "Atenção" | "Crítico";
  tone: "ok" | "attention" | "critical";
  summary: string;
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

export function extractRescheduleDescription(payload: unknown) {
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

export function getEventDescription(
  event: BookingJourneyResponse["events"][number],
) {
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

export function buildTimeline(data: BookingJourneyResponse): TimelineItem[] {
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

export function getReschedulePayload(payload: unknown) {
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

export function getRescheduleEvents(events: BookingJourneyResponse["events"]) {
  return events.filter((event) => event.type === "booking.rescheduled");
}

export function getLastRescheduleEvent(
  events: BookingJourneyResponse["events"],
) {
  const reschedules = getRescheduleEvents(events);

  if (reschedules.length === 0) return null;

  return [...reschedules].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}

export function getRecreatedOriginEvent(
  events: BookingJourneyResponse["events"],
) {
  return (
    events.find((event) => event.type === "booking.recreated_origin") ?? null
  );
}

export function getRecreatedFromCancelledEvent(
  events: BookingJourneyResponse["events"],
) {
  return (
    events.find((event) => event.type === "booking.recreated_from_cancelled") ??
    null
  );
}

export function getRelatedBookingLinks(
  events: BookingJourneyResponse["events"],
) {
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
export function getBookingStatus(value?: string | null) {
  return value?.toUpperCase?.() ?? "";
}
export function buildQuickSignals(input: {
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

export function buildJourneyHealth(input: {
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

export function buildJourneyScore(input: {
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

export function getRecommendedAction(
  data: BookingJourneyResponse,
): RecommendedAction {
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

export function buildJourneyOpportunities(input: {
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

export function buildJourneyInsights(input: {
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

export function buildJourneySuggestedCommunications(input: {
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
