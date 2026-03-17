import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  title: string;
  value: number | string;
  hint?: string;
  icon?: ReactNode;
};

export function DashboardStatCard({ title, value, hint, icon }: Props) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {value}
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>

        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </CardContent>
    </Card>
  );
}
