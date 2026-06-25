"use client";

import { createBrowserClient } from "@supabase/ssr";

const FALLBACK_SUPABASE_URL = "https://xzjfwxilejgqwttbcwkd.supabase.co";

const FALLBACK_SUPABASE_ANON_KEY = "COLE_AQUI_A_ANON_KEY_REAL";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Variáveis do Supabase não configuradas.");
  }

  return createBrowserClient(url, anonKey, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
