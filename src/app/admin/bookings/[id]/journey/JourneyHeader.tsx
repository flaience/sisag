// src/app/admin/bookings/[id]/journey/JourneyHeader.tsx
"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { BookingJourneyResponse } from "./types";
import { formatDateTime } from "@/lib/time";

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
  if (normalized.includes("RESCHEDULED")) {
    return "bg-violet-50 text-violet-700 border-violet-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

type Props = {
  data: BookingJourneyResponse;
};

export function JourneyHeader({ data }: Props) {
  const router = useRouter();

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm md:flex-row md:items-start md:justify-between md:p-6">
      <div className="min-w-0 space-y-3">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/bookings")}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para bookings
        </Button>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Jornada do booking
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Cliente: {data.client.name ?? "Não identificado"} · Início:{" "}
            {formatDateTime(data.booking.startTime)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
            data.booking.status,
          )}`}
        >
          {data.booking.status}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
          #{data.booking.id.slice(0, 8)}
        </span>
      </div>
    </section>
  );
}