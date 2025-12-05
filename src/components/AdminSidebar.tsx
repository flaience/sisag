"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompany } from "@/hooks/useCompany";
import { getPersonLabel } from "@/lib/businessLabels";

export default function AdminSidebar() {
  const pathname = usePathname();

  // hooks devem estar AQUI
  const company = useCompany();
  const peopleLabel = company
    ? getPersonLabel(company.businessType)
    : "Pessoas";

  const menuItems = [
    { name: "Dashboard", href: "/admin" },
    { name: "Empresas", href: "/admin/companies" },
    { name: "Profissionais", href: "/admin/professionals" },
    { name: peopleLabel, href: "/admin/people" },
    { name: "Config. Agendamento", href: "/admin/scheduling" },
    { name: "Agendamentos", href: "/admin/appointments" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 text-gray-700 flex flex-col shadow-sm">
      <div className="p-5 text-xl font-semibold tracking-tight border-b border-gray-200">
        Administração
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 rounded-md transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 font-medium border border-blue-200"
                  : "hover:bg-gray-100"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
