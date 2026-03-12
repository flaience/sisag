import Link from "next/link";
import { MessageCircleMore, FileText, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const items = [
  {
    title: "Status da integração",
    description: "Verifique a situação operacional da integração com WhatsApp.",
    icon: Activity,
    href: "/admin/settings/whatsapp",
  },
  {
    title: "Logs de envio",
    description:
      "Consulte registros de envio, falhas e resultados operacionais.",
    icon: FileText,
    href: "/admin/settings/whatsapp/logs",
  },
];

export default function WhatsAppSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.title} href={item.href}>
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

      <Card className="rounded-2xl border-slate-200">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="rounded-2xl bg-slate-100 p-3">
            <MessageCircleMore className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Integração operacional
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Esta área concentra os pontos principais da integração do SISAG
              com mensagens automáticas e comunicação com pacientes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
