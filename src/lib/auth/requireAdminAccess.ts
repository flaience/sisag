import { redirect } from "next/navigation";
import { getAuthenticatedUserContext } from "@/lib/auth/getAuthenticatedUserContext";
import { isAppRole } from "@/lib/auth/permissions";

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

  return auth;
}
