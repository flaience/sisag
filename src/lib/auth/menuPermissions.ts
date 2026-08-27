import { hasSomeRole, type AppRole } from "@/lib/auth/permissions";

export type AdminNavigationLocale = "pt-BR" | "es";
export type AdminNavigationGroupKey =
  | "principal"
  | "operation"
  | "structure"
  | "administration";

export type SidebarItemVisibility = {
  key: string;
  label: string;
  href: string;
  visible: boolean;
  group: AdminNavigationGroupKey;
};

export type SidebarGroup = {
  key: AdminNavigationGroupKey;
  label: string;
  items: SidebarItemVisibility[];
};

const labels = {
  "pt-BR": {
    groups: {
      principal: "Principal",
      operation: "Operação",
      structure: "Estrutura",
      administration: "Administração",
    },
    items: {
      overview: "Visão geral",
      agenda: "Agenda",
      appointments: "Agendamentos",
      clients: "Clientes",
      professionals: "Profissionais",
      company: "Empresa",
      settings: "Configurações",
    },
  },
  es: {
    groups: {
      principal: "Principal",
      operation: "Operación",
      structure: "Estructura",
      administration: "Administración",
    },
    items: {
      overview: "Resumen",
      agenda: "Agenda",
      appointments: "Citas",
      clients: "Clientes",
      professionals: "Profesionales",
      company: "Empresa",
      settings: "Configuración",
    },
  },
} as const;

export function canShowUsersMenu(role: string | null | undefined) {
  return hasSomeRole(role, ["owner"]);
}
export function canShowWhatsappMenu(role: string | null | undefined) {
  return hasSomeRole(role, ["owner"]);
}
export function canShowSettingsMenu(role: string | null | undefined) {
  return hasSomeRole(role, ["owner", "admin"]);
}
export function canShowCompaniesMenu(role: string | null | undefined) {
  return hasSomeRole(role, ["owner", "admin"]);
}
export function canShowProfessionalsMenu(role: string | null | undefined) {
  return hasSomeRole(role, ["owner", "admin"]);
}
export function canShowAppointmentsMenu(role: string | null | undefined) {
  return hasSomeRole(role, ["owner", "admin"]);
}
export function canShowBookingsMenu(role: string | null | undefined) {
  return hasSomeRole(role, ["owner", "admin", "staff"]);
}
export function canShowPeopleMenu(role: string | null | undefined) {
  return hasSomeRole(role, ["owner", "admin", "staff"]);
}
export function canShowVisitsMenu(role: string | null | undefined) {
  return hasSomeRole(role, ["owner", "admin", "staff"]);
}
export function canShowAgendaMenu(role: string | null | undefined) {
  return hasSomeRole(role, ["owner", "admin", "staff"]);
}

export function buildSidebarVisibility(
  role: string | null | undefined,
  locale: AdminNavigationLocale = "pt-BR",
): SidebarItemVisibility[] {
  const text = labels[locale].items;
  return [
    { key: "overview", label: text.overview, href: "/admin", visible: true, group: "principal" },
    { key: "agenda", label: text.agenda, href: "/admin/agenda", visible: canShowAgendaMenu(role), group: "operation" },
    { key: "appointments", label: text.appointments, href: "/admin/bookings", visible: canShowBookingsMenu(role), group: "operation" },
    { key: "clients", label: text.clients, href: "/admin/people", visible: canShowPeopleMenu(role), group: "operation" },
    { key: "professionals", label: text.professionals, href: "/admin/professionals", visible: canShowProfessionalsMenu(role), group: "structure" },
    { key: "company", label: text.company, href: "/admin/settings/company", visible: canShowCompaniesMenu(role), group: "structure" },
    { key: "settings", label: text.settings, href: "/admin/settings", visible: canShowSettingsMenu(role), group: "administration" },
  ];
}

export function buildSidebarGroups(
  role: string | null | undefined,
  locale: AdminNavigationLocale = "pt-BR",
): SidebarGroup[] {
  const visible = buildSidebarVisibility(role, locale).filter((item) => item.visible);
  const groupLabels = labels[locale].groups;
  return (Object.keys(groupLabels) as AdminNavigationGroupKey[])
    .map((key) => ({
      key,
      label: groupLabels[key],
      items: visible.filter((item) => item.group === key),
    }))
    .filter((group) => group.items.length > 0);
}
