// src/app/admin/bookings/[id]/journey/types.ts
import type { LucideIcon } from "lucide-react";

export type BookingJourneyResponse = {
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
export type TimelineItem = {
  id: string;
  date: string | null;
  title: string;
  description: string;
  kind: "booking" | "event" | "message" | "automation" | "session";
  status?: string | null;
};

export type ActionFeedback = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export type BookingQuickSignal = {
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

export type JourneyInsight = {
  id: string;
  title: string;
  description: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
};

export type JourneyOpportunity = {
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

export type JourneyHealthItem = {
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

export type JourneySuggestedCommunication = {
  id: string;
  title: string;
  description: string;
  message: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
  category: "pre" | "recovery" | "reminder" | "post";
};

export type JourneyPriority = {
  key: "recovery" | "confirmation" | "execution" | "continuity" | "healthy";
  level: "high" | "medium" | "low";
  reason: string;
};
