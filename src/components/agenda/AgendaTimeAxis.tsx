import type { AgendaTimeSlot } from "@/modules/agenda/Agenda.types";

type Props = {
  slots: AgendaTimeSlot[];
  slotHeight: number;
};

export function AgendaTimeAxis({ slots, slotHeight }: Props) {
  return (
    <div className="w-20 shrink-0">
      <div className="h-16" />
      <div className="relative">
        {slots.map((slot) => (
          <div
            key={slot.label}
            className="relative border-t text-xs text-muted-foreground"
            style={{ height: `${slotHeight}px` }}
          >
            <span className="absolute -top-2 left-0 rounded bg-background pr-2">
              {slot.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
