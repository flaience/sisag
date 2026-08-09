import { redirect } from "next/navigation";
import { getAuthenticatedUserContext } from "@/lib/auth/getAuthenticatedUserContext";
import { isAppRole } from "@/lib/auth/permissions";
import { requireCommercialAccess } from "@/lib/auth/requireCommercialAccess";

export async function requireAdminAccess(accessToken?: string) {
  const auth = await getAuthenticatedUserContext(accessToken);

  if (!auth?.userId) {
    redirect("/login");
  }

  if (!auth.companyId) {
    redirect("/login");
  }

  if (!isAppRole(auth.role)) {
    redirect("/unauthorized");
  }

  requireCommercialAccess(auth.commercialAccess);

  return auth;
}
