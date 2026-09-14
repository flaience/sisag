import { requireAdminAccess } from "@/lib/auth/requireAdminAccess";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const auth = await requireAdminAccess(session?.access_token ?? "");

  return (
    <AuthProvider>
    <AdminShell
      user={{
        id: auth.userId,
        name: auth.name ?? "Usuário",
        role: auth.role,
      }}
    >
      {children}
    </AdminShell>
    </AuthProvider>
  );
}
