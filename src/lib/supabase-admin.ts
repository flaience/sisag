// src/lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const SUPABASE_SERVICE_ROLE_SECRET_PATH =
  "/run/secrets/supabase_service_role_key";

function readServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  try {
    return readFileSync(SUPABASE_SERVICE_ROLE_SECRET_PATH, "utf8").trim();
  } catch {
    return undefined;
  }
}

export function supabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = readServiceRoleKey();

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Supabase Admin configuration missing during runtime.");
    throw new Error("Supabase Admin: Missing runtime configuration!");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
