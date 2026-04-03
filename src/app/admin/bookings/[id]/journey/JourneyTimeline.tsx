// src/app/admin/bookings/[id]/journey/JourneyTimeline.tsx
"use client";

import {
  Activity,
  FileText,
  History,
  MessageCircleMore,
  MessageSquare,
  Workflow,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/time";
import type { TimelineItem } from "./types";

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

type Props = {
  timeline: TimelineItem[];
  lastRescheduleEventId?: string | null;
};

export function JourneyTimeline({ timeline, lastRescheduleEventId }: Props) {
  return (
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
              const isLatestReschedule =
                item.kind === "event" &&
                item.title === "Booking reagendado" &&
                lastRescheduleEventId &&
                item.id === `event-${lastRescheduleEventId}`;

              return (
                <div key={item.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full ${
                        isLatestReschedule
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

                        {isLatestReschedule && (
                          <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            Mais recente
                          </span>
                        )}
                      </div>

                      {item.status ? (
                        <span
                          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      ) : null}
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
  );
}
