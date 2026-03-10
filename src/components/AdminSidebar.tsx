"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Building2,
  Stethoscope,
  Users,
  LayoutDashboard,
  Settings,
  ClipboardList,
} from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { getPersonLabel } from "@/lib/businessLabels";

type MenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

export default function AdminSidebar() {
  const pathname = usePathname();
  const company = useCompany();

  const peopleLabel = company
    ? getPersonLabel(company.businessType)
    : "Pessoas";

  const sections: MenuSection[] = [
    {
      title: "Principal",
      items: [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Agenda", href: "/admin/agenda", icon: CalendarDays },
        {
          name: "Agendamentos",
          href: "/admin/appointments",
          icon: ClipboardList,
        },
      ],
    },
    {
      title: "Cadastros",
      items: [
        { name: peopleLabel, href: "/admin/people", icon: Users },
        {
          name: "Profissionais",
          href: "/admin/professionals",
          icon: Stethoscope,
        },
        { name: "Empresas", href: "/admin/companies", icon: Building2 },
      ],
    },
    {
      title: "Configurações",
      items: [
        {
          name: "Config. Agendamento",
          href: "/admin/scheduling",
          icon: Settings,
        },
      ],
    },
  ];

  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="hidden w-72 border-r border-slate-200 bg-white md:flex md:flex-col">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          SISAG
        </div>
        <div className="mt-1 text-xl font-semibold text-slate-900">
          Administração
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {company?.name ?? "Painel da clínica"}
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {section.title}
            </h2>

            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
