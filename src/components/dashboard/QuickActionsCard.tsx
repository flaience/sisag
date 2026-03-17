import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  PlusCircle,
  Settings,
  Stethoscope,
} from "lucide-react";

import { DashboardSection } from "./DashboardSection";

const actions = [
  {
    href: "/admin/agenda",
    label: "Abrir agenda",
    icon: CalendarDays,
  },
  {
    href: "/admin/appointments/new",
    label: "Novo atendimento",
    icon: PlusCircle,
  },
  {
    href: "/admin/bookings",
    label: "Ver jornadas",
    icon: ClipboardList,
  },
  {
    href: "/admin/professionals",
    label: "Profissionais",
    icon: Stethoscope,
  },
  {
    href: "/admin/companies",
    label: "Empresas",
    icon: Building2,
  },
  {
    href: "/admin/settings",
    label: "Configurações",
    icon: Settings,
  },
];

export function QuickActionsCard() {
  return (
    <DashboardSection
      title="Ações rápidas"
      description="Acessos mais usados no dia a dia"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center justify-between rounded-xl border p-4 transition hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{action.label}</span>
              </div>

              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </DashboardSection>
  );
}
