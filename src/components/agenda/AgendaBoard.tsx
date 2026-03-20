//src/components/agenda/AgendaBoard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgendaProfessionalColumn as AgendaProfessionalColumnType } from "@/modules/agenda/Agenda.types";
import { AgendaProfessionalColumn } from "./AgendaProfessionalColumn";

type Props = {
  columns: AgendaProfessionalColumnType[];
};

export function AgendaBoard({ columns }: Props) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">
          Agenda por profissional
        </CardTitle>
      </CardHeader>

      <CardContent>
        {columns.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            Nenhum profissional encontrado.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((column) => (
              <AgendaProfessionalColumn
                key={column.professionalId}
                column={column}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
