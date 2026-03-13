//src/components/AdminSidebar.tsx

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
  ClipboardCheck,
  X,
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

type AdminSidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export default function AdminSidebar({
  mobile = false,
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const company = useCompany();

  const peopleLabel = getPersonLabel(company?.businessType);

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
        {
          name: "Bookings",
          href: "/admin/bookings",
          icon: ClipboardCheck,
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
        { name: "Configurações", href: "/admin/settings", icon: Settings },
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
    <aside
      className={[
        "border-r border-slate-200 bg-white",
        mobile
          ? "flex h-full w-full flex-col"
          : "hidden w-72 md:flex md:flex-col",
      ].join(" ")}
    >
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
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

          {mobile && (
            <button
              type="button"
              onClick={onNavigate}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
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
                    onClick={onNavigate}
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
