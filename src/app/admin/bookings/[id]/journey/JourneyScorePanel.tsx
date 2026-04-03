"use client";

import { Button } from "@/components/ui/button";

type JourneyScoreTone = "ok" | "attention" | "critical";

type JourneyScore = {
  score: number;
  label: "Saudável" | "Atenção" | "Crítico";
  tone: JourneyScoreTone;
  summary: string;
};

type Props = {
  journeyScore: JourneyScore;
  nextBestAction: string;
  hasNextBestAction: boolean;
  onNextBestAction: () => void;
};

function getJourneyScoreClasses(tone: JourneyScoreTone) {
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

export function JourneyScorePanel({
  journeyScore,
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
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">
            Saúde geral da jornada
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {journeyScore.score}/100
          </p>
          <p className="mt-2 text-sm font-medium">{journeyScore.label}</p>
          <p className="mt-2 text-sm opacity-80">{journeyScore.summary}</p>
        </div>

        <div className="md:max-w-sm">
          <p className="text-sm font-semibold">Próxima melhor ação</p>
          <p className="mt-1 text-sm opacity-80">{nextBestAction}</p>

          {hasNextBestAction ? (
            <div className="mt-3">
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
