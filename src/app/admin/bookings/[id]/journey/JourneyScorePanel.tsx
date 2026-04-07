"use client";

import { Button } from "@/components/ui/button";
import type { JourneyPriority, JourneyScore } from "./types";

type Props = {
  journeyScore: JourneyScore;
  priority: JourneyPriority;
  nextBestAction: string;
  hasNextBestAction: boolean;
  onNextBestAction: () => void;
};

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

function getPriorityBadgeClasses(priority: JourneyPriority) {
  if (priority.level === "high") {
    return "border-rose-200 bg-rose-100 text-rose-800";
  }

  if (priority.level === "medium") {
    return "border-amber-200 bg-amber-100 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-100 text-emerald-800";
}

function getPriorityLabel(priority: JourneyPriority) {
  switch (priority.key) {
    case "recovery":
      return "Prioridade: recuperação";
    case "confirmation":
      return "Prioridade: confirmação";
    case "execution":
      return "Prioridade: execução";
    case "continuity":
      return "Prioridade: continuidade";
    default:
      return "Prioridade: jornada saudável";
  }
}

export function JourneyScorePanel({
  journeyScore,
  priority,
  nextBestAction,
  hasNextBestAction,
  onNextBestAction,
}: Props) {
  return (
    <div
      className={`rounded-2xl border p-5 ${getJourneyScoreClasses(
        journeyScore.tone,
      )}`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium opacity-80">
            Saúde geral da jornada
          </p>

          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-semibold tracking-tight">
              {journeyScore.score}
            </span>
            <span className="pb-1 text-sm opacity-70">/100</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-current/20 px-3 py-1 text-xs font-medium">
              {journeyScore.label}
            </span>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getPriorityBadgeClasses(
                priority,
              )}`}
            >
              {getPriorityLabel(priority)}
            </span>
          </div>

          <p className="mt-4 max-w-2xl text-sm opacity-80">
            {journeyScore.summary}
          </p>

          <div className="mt-4 rounded-xl border border-black/5 bg-white/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
              Motivo principal
            </p>
            <p className="mt-1 text-sm font-medium">{priority.reason}</p>
          </div>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white/40 p-4">
          <p className="text-sm font-semibold">Próxima melhor ação</p>
          <p className="mt-2 text-sm opacity-80">{nextBestAction}</p>

          {hasNextBestAction ? (
            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onNextBestAction}
              >
                Executar ação
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
