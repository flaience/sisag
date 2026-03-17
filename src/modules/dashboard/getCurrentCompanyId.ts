import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { profiles } from "@/drizzle/schema";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function getCurrentCompanyId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const db = getDb();

  const rows = await db
    .select({
      companyId: profiles.companyId,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return rows[0]?.companyId ?? null;
}
