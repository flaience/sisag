// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseServer() {
  // cookies() agora é assíncrono → precisamos do await
  const cookieStore = await cookies();

  // criamos um wrapper tipado corretamente para o Supabase SSR
  const cookieMethods = {
    get: (name: string) => {
      try {
        const value = cookieStore.get(name);
        return value?.value ?? undefined;
      } catch {
        return undefined;
      }
    },
    set: (name: string, value: string, options?: any) => {
      try {
        cookieStore.set(name, value, options);
      } catch {
        // ignore; Next pode não permitir em algumas rotas
      }
    },
    remove: (name: string, options?: any) => {
      try {
        cookieStore.set(name, "", { ...options, maxAge: 0 });
      } catch {
        // ignore
      }
    },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieMethods,
    }
  );
}
