import Link from "next/link";
import { CalendarClock, CalendarDays, CalendarOff, MessageCircleMore, FileText, BellRing } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const items = [
  { title: "Lembretes", description: "Configure antecedência e mensagem automática para reduzir faltas.", href: "/admin/settings/booking-reminders", icon: BellRing },
  {
    title: "Agendamento",
    description:
      "Defina duração padrão, buffer entre consultas e regras de disponibilidade.",
    href: "/admin/settings/scheduling",
    icon: CalendarDays,
  },
  {
    title: "Profissionais por turno",
    description: "Defina profissionais preferenciais por local, serviço, dia e horário.",
    href: "/admin/settings/service-assignments",
    icon: CalendarClock,
  },
  {
    title: "Feriados e bloqueios",
    description: "Registre fechamentos, ausências e períodos indisponíveis sem apagar a agenda semanal.",
    href: "/admin/settings/availability-exceptions",
    icon: CalendarOff,
  },
  {
    title: "WhatsApp",
    description:
      "Acompanhe integrações, status e fluxo operacional da comunicação.",
    href: "/admin/settings/whatsapp",
    icon: MessageCircleMore,
  },
  {
    title: "Logs do WhatsApp",
    description:
      "Consulte eventos, histórico e resultados do envio de mensagens.",
    href: "/admin/settings/whatsapp/logs",
    icon: FileText,
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">
          Gerencie parâmetros do sistema e integrações operacionais.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full rounded-2xl border-slate-200 transition-colors hover:bg-slate-50">
                <CardContent className="p-5">
                  <div className="inline-flex rounded-2xl bg-slate-100 p-3">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>

                  <h2 className="mt-4 text-base font-semibold text-slate-900">
                    {item.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
