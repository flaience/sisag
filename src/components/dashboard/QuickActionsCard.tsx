import Link from "next/link";
import {
  CalendarPlus2,
  Users,
  Building2,
  ClipboardCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const actions = [
  {
    href: "/admin/bookings/new",
    title: "Novo booking",
    description:
      "Crie rapidamente um novo atendimento e alimente a agenda da operação.",
    icon: CalendarPlus2,
    tone: "default" as const,
  },
  {
    href: "/admin/bookings",
    title: "Ver bookings",
    description: "Acompanhe os atendimentos e visualize o fluxo operacional.",
    icon: ClipboardCheck,
    tone: "info" as const,
  },
  {
    href: "/admin/people",
    title: "Pessoas",
    description:
      "Consulte cadastros e acompanhe a base de relacionamento da clínica.",
    icon: Users,
    tone: "success" as const,
  },
  {
    href: "/admin/companies",
    title: "Empresas",
    description:
      "Gerencie empresas vinculadas e mantenha a operação organizada.",
    icon: Building2,
    tone: "warning" as const,
  },
];

function getActionClasses(tone: "default" | "info" | "success" | "warning") {
  switch (tone) {
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

function getIconWrapClasses(tone: "default" | "info" | "success" | "warning") {
  switch (tone) {
    case "info":
      return "bg-white text-sky-700 border-sky-200";
    case "success":
      return "bg-white text-emerald-700 border-emerald-200";
    case "warning":
      return "bg-white text-amber-700 border-amber-200";
    default:
      return "bg-white text-slate-700 border-slate-200";
  }
}

export function QuickActionsCard() {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Sparkles className="h-5 w-5 text-slate-500" />
          Ações rápidas
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">
            Acelere a rotina da clínica
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use estes atalhos para navegar mais rápido entre as áreas mais
            importantes da operação.
          </p>
        </div>

        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                href={action.href}
                className={`block rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${getActionClasses(
                  action.tone,
                )}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-xl border p-2 shadow-sm ${getIconWrapClasses(
                      action.tone,
                    )}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{action.title}</p>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                    </div>

                    <p className="mt-2 text-sm leading-6 opacity-80">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="pt-1">
          <Button asChild variant="outline" className="w-full">
            <Link href="/admin/bookings">Abrir painel operacional</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
