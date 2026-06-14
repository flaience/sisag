//src/components/dashboard/MessagingStatusCard.tsx
import {
  AlertTriangle,
  CheckCheck,
  Eye,
  MessageSquare,
  Send,
} from "lucide-react";

import { formatDateTime } from "@/lib/time";
import { DashboardSection } from "./DashboardSection";

type Props = {
  receivedToday: number;
  sentToday: number;
  deliveredToday: number;
  readToday: number;
  failedToday: number;
  lastMessageAt: string | null;
};

export function MessagingStatusCard(props: Props) {
  return (
    <DashboardSection
      title="Comunicação"
      description="Status das mensagens do dia"
      icon={<MessageSquare className="h-4 w-4" />}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Recebidas
          </div>
          <p className="text-2xl font-semibold">{props.receivedToday}</p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Send className="h-4 w-4" />
            Enviadas
          </div>
          <p className="text-2xl font-semibold">{props.sentToday}</p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCheck className="h-4 w-4" />
            Entregues
          </div>
          <p className="text-2xl font-semibold">{props.deliveredToday}</p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            Lidas
          </div>
          <p className="text-2xl font-semibold">{props.readToday}</p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Falhas
          </div>
          <p className="text-2xl font-semibold">{props.failedToday}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border p-4 text-sm text-muted-foreground">
        Última atividade de mensagem: {formatDateTime(props.lastMessageAt)}
      </div>
    </DashboardSection>
  );
}
