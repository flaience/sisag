import { cookies } from "next/headers";
import { requireAdminAccess } from "@/lib/auth/requireAdminAccess";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value ?? "";

  const auth = await requireAdminAccess(accessToken);

  return (
    <AdminShell
      user={{
        id: auth.userId,
        name: auth.name ?? "Usuário",
        role: auth.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
