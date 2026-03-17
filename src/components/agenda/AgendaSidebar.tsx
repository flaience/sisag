import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgendaProfessionalSummary } from "@/modules/agenda/Agenda.types";

type Props = {
  professionals: AgendaProfessionalSummary[];
};

export function AgendaSidebar({ professionals }: Props) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">
          Carga por profissional
        </CardTitle>
      </CardHeader>

      <CardContent>
        {professionals.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Nenhum profissional com agenda nesta data.
          </div>
        ) : (
          <div className="space-y-3">
            {professionals.map((item) => (
              <div key={item.professionalId} className="rounded-xl border p-4">
                <p className="font-medium">{item.professionalName}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                  <div>
                    <p>Total</p>
                    <p className="font-semibold text-foreground">
                      {item.totalAppointments}
                    </p>
                  </div>
                  <div>
                    <p>Confirmados</p>
                    <p className="font-semibold text-foreground">
                      {item.confirmed}
                    </p>
                  </div>
                  <div>
                    <p>Pendentes</p>
                    <p className="font-semibold text-foreground">
                      {item.pending}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
