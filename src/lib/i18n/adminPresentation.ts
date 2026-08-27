import type { AppRole } from "@/lib/auth/permissions";
import type { AdminNavigationLocale } from "@/lib/auth/menuPermissions";

const roleLabels: Record<AdminNavigationLocale, Record<AppRole, string>> = {
  "pt-BR": {
    owner: "Proprietário",
    admin: "Administrador",
    staff: "Equipe",
  },
  es: {
    owner: "Propietario",
    admin: "Administrador",
    staff: "Equipo",
  },
};

export function getAdminRoleLabel(
  role: AppRole | null | undefined,
  locale: AdminNavigationLocale = "pt-BR",
) {
  return role ? roleLabels[locale][role] : locale === "es" ? "Sin perfil" : "Sem perfil";
}
