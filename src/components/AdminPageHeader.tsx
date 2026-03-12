"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

type RouteMeta = {
  title: string;
  description: string;
};

const routeMap: Record<string, RouteMeta> = {
  "/admin": {
    title: "Dashboard",
    description: "Visão geral da operação da clínica.",
  },
  "/admin/agenda": {
    title: "Agenda",
    description: "Visualize horários, agenda diária e agenda semanal.",
  },
  "/admin/appointments": {
    title: "Agendamentos",
    description: "Gerencie os agendamentos da clínica.",
  },
  "/admin/appointments/new": {
    title: "Novo agendamento",
    description: "Crie um novo agendamento para a clínica.",
  },
  "/admin/people": {
    title: "Pessoas",
    description: "Gerencie clientes e pessoas cadastradas.",
  },
  "/admin/people/new": {
    title: "Nova pessoa",
    description: "Cadastre uma nova pessoa no sistema.",
  },
  "/admin/professionals": {
    title: "Profissionais",
    description: "Gerencie profissionais e disponibilidade.",
  },
  "/admin/professionals/new": {
    title: "Novo profissional",
    description: "Cadastre um novo profissional no sistema.",
  },
  "/admin/companies": {
    title: "Empresas",
    description: "Gerencie empresas vinculadas ao sistema.",
  },
  "/admin/companies/new": {
    title: "Nova empresa",
    description: "Cadastre uma nova empresa.",
  },
  "/admin/settings": {
    title: "Configurações",
    description: "Gerencie parâmetros e integrações do sistema.",
  },
  "/admin/settings/scheduling": {
    title: "Configuração de agendamentos",
    description: "Defina regras da agenda e disponibilidade.",
  },
  "/admin/settings/whatsapp": {
    title: "WhatsApp",
    description: "Acompanhe a integração de mensagens.",
  },
  "/admin/settings/whatsapp/logs": {
    title: "Logs do WhatsApp",
    description: "Consulte o histórico operacional das mensagens.",
  },
};

function prettifySegment(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\[id\]/g, "Detalhe")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [];
  let currentPath = "";

  for (const segment of segments) {
    currentPath += `/${segment}`;

    let label = prettifySegment(segment);

    if (segment === "admin") label = "Admin";
    if (segment === "appointments") label = "Agendamentos";
    if (segment === "agenda") label = "Agenda";
    if (segment === "people") label = "Pessoas";
    if (segment === "professionals") label = "Profissionais";
    if (segment === "companies") label = "Empresas";
    if (segment === "settings") label = "Configurações";
    if (segment === "scheduling") label = "Agendamento";
    if (segment === "whatsapp") label = "WhatsApp";
    if (segment === "logs") label = "Logs";
    if (segment === "new") label = "Novo";
    if (segment === "edit") label = "Editar";

    crumbs.push({
      label,
      href: currentPath,
    });
  }

  return crumbs;
}

function resolveMeta(pathname: string): RouteMeta {
  if (routeMap[pathname]) {
    return routeMap[pathname];
  }

  if (pathname.includes("/edit")) {
    if (pathname.includes("/appointments/")) {
      return {
        title: "Editar agendamento",
        description: "Atualize, cancele ou reagende um atendimento.",
      };
    }

    if (pathname.includes("/people/")) {
      return {
        title: "Editar pessoa",
        description: "Atualize os dados da pessoa cadastrada.",
      };
    }

    if (pathname.includes("/professionals/")) {
      return {
        title: "Editar profissional",
        description: "Atualize os dados do profissional.",
      };
    }

    if (pathname.includes("/companies/")) {
      return {
        title: "Editar empresa",
        description: "Atualize os dados da empresa cadastrada.",
      };
    }
  }

  return {
    title: "SISAG Admin",
    description: "Gestão clínica e agendamentos.",
  };
}

export default function AdminPageHeader() {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);
  const meta = resolveMeta(pathname);

  return (
    <div className="space-y-3">
      <nav className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-1 text-xs text-slate-500 sm:text-sm">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <div key={crumb.href} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}

                {isLast ? (
                  <span className="font-medium text-slate-900">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="whitespace-nowrap hover:text-slate-900"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div>
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
          {meta.title}
        </h1>
        <p className="text-sm text-slate-500">{meta.description}</p>
      </div>
    </div>
  );
}
