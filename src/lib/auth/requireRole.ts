import { redirect } from "next/navigation";
import { hasSomeRole, type AppRole } from "@/lib/auth/permissions";
import { getAuthenticatedUserContext } from "@/lib/auth/getAuthenticatedUserContext";

type RequireRoleOptions = {
  accessToken?: string;
  allowedRoles: AppRole[];
  redirectTo?: string;
};

export async function requireRole(options: RequireRoleOptions) {
  const auth = await getAuthenticatedUserContext(options.accessToken);

  if (!auth?.userId) {
    redirect("/login");
  }

  if (!auth.companyId) {
    redirect("/login");
  }

  if (!hasSomeRole(auth.role, options.allowedRoles)) {
    redirect(options.redirectTo ?? "/unauthorized");
  }

  return auth;
}
