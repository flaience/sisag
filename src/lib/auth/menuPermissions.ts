import { hasSomeRole, type AppRole } from "@/lib/auth/permissions";

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
  return hasSomeRole(role, ["owner"]);
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

export type SidebarItemVisibility = {
  label: string;
  href: string;
  visible: boolean;
};

export function buildSidebarVisibility(
  role: string | null | undefined,
): SidebarItemVisibility[] {
  return [
    { label: "Dashboard", href: "/admin", visible: true },
    {
      label: "Agenda",
      href: "/admin/agenda",
      visible: canShowAgendaMenu(role),
    },
    {
      label: "Agendamentos",
      href: "/admin/bookings",
      visible: canShowBookingsMenu(role),
    },
    {
      label: "Appointments",
      href: "/admin/appointments",
      visible: canShowAppointmentsMenu(role),
    },
    {
      label: "Pessoas",
      href: "/admin/people",
      visible: canShowPeopleMenu(role),
    },
    {
      label: "Profissionais",
      href: "/admin/professionals",
      visible: canShowProfessionalsMenu(role),
    },
    {
      label: "Empresas",
      href: "/admin/companies",
      visible: canShowCompaniesMenu(role),
    },
    {
      label: "Configurações",
      href: "/admin/settings",
      visible: canShowSettingsMenu(role),
    },
    {
      label: "Usuários",
      href: "/admin/settings/users",
      visible: canShowUsersMenu(role),
    },
    {
      label: "WhatsApp",
      href: "/admin/settings/whatsapp",
      visible: canShowWhatsappMenu(role),
    },
    {
      label: "Visitas",
      href: "/admin/visits",
      visible: canShowVisitsMenu(role),
    },
  ];
}
