// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseServer() {
  // Evita erro no build
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.log("⚠️ Supabase skipped during build");
    return null as any;
  }

  // cookies() pode ser síncrono OU assíncrono dependendo do runtime
  const cookieStore = await Promise.resolve(cookies());

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          try {
            const c: any = cookieStore.get(name);
            return typeof c === "string" ? c : c?.value;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string, options?: any) {
          try {
            (cookieStore as any).set?.(name, value, options);
          } catch {}
        },
        remove(name: string, options?: any) {
          try {
            (cookieStore as any).set?.(name, "", { ...options, maxAge: 0 });
          } catch {}
        },
      },
    }
  );
}
