import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgendaAppointmentItem } from "@/modules/agenda/Agenda.types";
import { AgendaAppointmentCard } from "./AgendaAppointmentCard";

type Props = {
  items: AgendaAppointmentItem[];
};

export function AgendaTimeline({ items }: Props) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Agenda do dia</CardTitle>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            Nenhum atendimento agendado para esta data.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <AgendaAppointmentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
