//src/components/dashboard/AutomationStatusCard.tsx
import { AlertTriangle, Bot, CheckCircle2, Clock3 } from "lucide-react";

import { formatDateTime } from "@/lib/time";
import { DashboardSection } from "./DashboardSection";

type Props = {
  pending: number;
  completedToday: number;
  failed: number;
  nextRunAt: string | null;
};

export function AutomationStatusCard(props: Props) {
  return (
    <DashboardSection
      title="Automações"
      description="Saúde operacional das rotinas"
      icon={<Bot className="h-4 w-4" />}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            Pendentes
          </div>
          <p className="text-2xl font-semibold">{props.pending}</p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Concluídas
          </div>
          <p className="text-2xl font-semibold">{props.completedToday}</p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Falhas
          </div>
          <p className="text-2xl font-semibold">{props.failed}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border p-4 text-sm text-muted-foreground">
        Próxima automação:{" "}
        {props.nextRunAt
          ? formatDateTime(props.nextRunAt)
          : "Nenhuma automação pendente"}
      </div>
    </DashboardSection>
  );
}
