export type AppRole = "owner" | "admin" | "staff";

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  staff: 1,
  admin: 2,
  owner: 3,
};

export function isAppRole(value: string | null | undefined): value is AppRole {
  return value === "owner" || value === "admin" || value === "staff";
}

export function hasMinimumRole(
  currentRole: string | null | undefined,
  minimumRole: AppRole,
) {
  if (!isAppRole(currentRole)) return false;

  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[minimumRole];
}

export function hasSomeRole(
  currentRole: string | null | undefined,
  allowedRoles: AppRole[],
) {
  if (!isAppRole(currentRole)) return false;

  return allowedRoles.includes(currentRole);
}

export const routePermissions: Array<{
  pattern: RegExp;
  roles: AppRole[];
}> = [
  { pattern: /^\/admin$/, roles: ["owner", "admin", "staff"] },
  { pattern: /^\/admin\/agenda/, roles: ["owner", "admin", "staff"] },
  { pattern: /^\/admin\/bookings/, roles: ["owner", "admin", "staff"] },
  { pattern: /^\/admin\/people/, roles: ["owner", "admin", "staff"] },
  { pattern: /^\/admin\/visits/, roles: ["owner", "admin", "staff"] },

  { pattern: /^\/admin\/appointments/, roles: ["owner", "admin"] },
  { pattern: /^\/admin\/professionals/, roles: ["owner", "admin"] },
  { pattern: /^\/admin\/settings$/, roles: ["owner", "admin"] },
  { pattern: /^\/admin\/settings\/scheduling/, roles: ["owner", "admin"] },

  { pattern: /^\/admin\/companies/, roles: ["owner"] },
  { pattern: /^\/admin\/settings\/whatsapp/, roles: ["owner"] },
  { pattern: /^\/admin\/settings\/users/, roles: ["owner"] },
];

export function canAccessRoute(
  pathname: string,
  currentRole: string | null | undefined,
) {
  if (!isAppRole(currentRole)) return false;

  const matched = routePermissions.find((item) => item.pattern.test(pathname));

  if (!matched) return false;

  return matched.roles.includes(currentRole);
}
