import Link from "next/link";
import { CalendarDays, MessageCircleMore, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const items = [
  {
    title: "Agendamento",
    description:
      "Defina duração padrão, buffer entre consultas e regras de disponibilidade.",
    href: "/admin/settings/scheduling",
    icon: CalendarDays,
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
