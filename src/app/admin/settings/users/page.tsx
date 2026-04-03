import { cookies } from "next/headers";
import { requireRole } from "@/lib/auth/requireRole";
import { AdminUsersClient } from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value ?? "";

  await requireRole({
    accessToken,
    allowedRoles: ["owner"],
  });

  return <AdminUsersClient />;
}
