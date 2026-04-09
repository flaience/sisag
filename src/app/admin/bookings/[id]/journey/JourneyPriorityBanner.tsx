"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JourneyPriority } from "./types";

type Props = {
  priority: JourneyPriority;
  nextBestAction: string;
  nextBestActionLabel?: string;
  onRunAction: () => void;
};

function getBannerClasses(priority: JourneyPriority) {
  if (priority.level === "high") {
    return "border-rose-200 bg-rose-50 text-rose-950";
  }

  if (priority.level === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-950";
}

function getPriorityIcon(priority: JourneyPriority) {
  switch (priority.key) {
    case "recovery":
      return RefreshCcw;
    case "confirmation":
      return Clock3;
    case "execution":
      return Wrench;
    case "continuity":
      return AlertTriangle;
    default:
      return CheckCircle2;
  }
}

function getPriorityTitle(priority: JourneyPriority) {
  switch (priority.key) {
    case "recovery":
      return "Prioridade atual: recuperar a jornada";
    case "confirmation":
      return "Prioridade atual: consolidar o booking";
    case "execution":
      return "Prioridade atual: preparar a execução";
    case "continuity":
      return "Prioridade atual: sustentar a continuidade";
    default:
      return "Prioridade atual: manter a jornada saudável";
  }
}

export function JourneyPriorityBanner({
  priority,
  nextBestAction,
  nextBestActionLabel,
  onRunAction,
}: Props) {
  const Icon = getPriorityIcon(priority);

  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm md:p-5 ${getBannerClasses(
        priority,
      )}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="rounded-2xl bg-white/60 p-2">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {getPriorityTitle(priority)}
            </p>
            <p className="mt-1 text-sm opacity-90">{priority.reason}</p>
            <p className="mt-3 text-sm font-medium opacity-90">
              Próxima melhor ação: {nextBestAction}
            </p>
          </div>
        </div>

        {nextBestActionLabel ? (
          <div className="lg:shrink-0">
            <Button type="button" variant="outline" onClick={onRunAction}>
              {nextBestActionLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
