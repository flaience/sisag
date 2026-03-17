import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AgendaProfessionalColumn,
  AgendaTimeSlot,
} from "@/modules/agenda/Agenda.types";
import { AgendaTimeAxis } from "./AgendaTimeAxis";
import { AgendaTimeColumn } from "./AgendaTimeColumn";

type Props = {
  columns: AgendaProfessionalColumn[];
};

function buildSlots(): AgendaTimeSlot[] {
  const slots: AgendaTimeSlot[] = [];

  for (let hour = 7; hour <= 19; hour++) {
    for (const minute of [0, 30]) {
      const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      slots.push({
        label,
        hour,
        minute,
        minutesOfDay: hour * 60 + minute,
      });
    }
  }

  return slots;
}

export function AgendaTimeGrid({ columns }: Props) {
  const slots = buildSlots();
  const slotHeight = 72;

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">
          Grade horária da agenda
        </CardTitle>
      </CardHeader>

      <CardContent>
        {columns.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            Nenhum profissional encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-4">
              <AgendaTimeAxis slots={slots} slotHeight={slotHeight} />

              {columns.map((column) => (
                <AgendaTimeColumn
                  key={column.professionalId}
                  column={column}
                  slots={slots}
                  slotHeight={slotHeight}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
