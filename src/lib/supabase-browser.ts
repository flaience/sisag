//src/lib/supabase-browser.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = "https://xzjfwxilejgqwttbcwkd.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6amZ3eGlsZWpncXd0dGJjd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTAzNzIsImV4cCI6MjA3ODM4NjM3Mn0.uwccV3BnJ2SwH8y1mKwboZlACT5vClJi7QCwe-3RtqI";

export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
