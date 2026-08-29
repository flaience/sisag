import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireRole } from "@/lib/auth/requireRole";
export default async function AdminProfessionalsLayout({ children }: { children: React.ReactNode }) { const supabase = await getSupabaseServerClient(); const { data: { session } } = await supabase.auth.getSession(); await requireRole({ accessToken: session?.access_token ?? "", allowedRoles: ["owner", "admin"] }); return <>{children}</>; }
