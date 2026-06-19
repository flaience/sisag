"use client";

import { createBrowserClient } from "@supabase/ssr";

const FALLBACK_SUPABASE_URL = "https://xzjfwxilejgqwttbcwkd.supabase.co";

const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6amZ3eGlsZWpncXd0dGJjd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTAzNzIsImV4cCI6MjA3ODM4NjM3Mn0.uwccV3BnJ2SwH8y1mKwboZlACT5vClJi7QCwe-3RtqI";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Variáveis do Supabase não configuradas.");
  }

  return createBrowserClient(url, anonKey);
}
