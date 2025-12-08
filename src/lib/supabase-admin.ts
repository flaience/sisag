// src/lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Supabase Admin env vars missing during runtime.");
    throw new Error("Supabase Admin: Missing environment variables!");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
