// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware compatível com @supabase/ssr v0.7.x (Next.js 16 App Router).
 * - libera rotas públicas
 * - cria cliente SSR do supabase usando cookies do request/response
 * - evita erro de typing do TS ao fornecer `cookies` corretamente
 */

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // rotas públicas (não bloqueadas)
  const publicRoutes = ["/login", "/api/test-auth", "/api/public"];

  if (publicRoutes.some((r) => path.startsWith(r))) {
    return NextResponse.next();
  }

  // resposta mutável para podermos setar cookies (res.cookies)
  const res = NextResponse.next({
    request: { headers: new Headers(req.headers) },
  });

  // construímos o objeto cookies com assinaturas claras para TS
  const cookieMethods = {
    get: (name: string): string | undefined => {
      // NextRequest.cookies.get retorna RequestCookiesEntry | string dep. da versão
      // usamos acesso resiliente
      try {
        // novo Next: req.cookies.get(name)?.value
        // fallback: (req.cookies as any).get(name)
        const entry: any = (req.cookies as any).get
          ? (req.cookies as any).get(name)
          : undefined;
        if (!entry) return undefined;
        // se entry tem .value (Recent Next), retorne, senão se for string, retorne
        return typeof entry === "string" ? entry : entry.value;
      } catch {
        return undefined;
      }
    },
    set: (name: string, value: string, options?: any) => {
      try {
        // NextResponse.cookies.set existe
        (res.cookies as any).set(name, value, options);
      } catch {
        // ignore em runtimes que não suportam set()
      }
    },
    remove: (name: string, options?: any) => {
      try {
        (res.cookies as any).set(name, "", { ...options, maxAge: 0 });
      } catch {
        // ignore
      }
    },
  };

  // o TS reclama das sobrecargas — cast para any na opção cookies para bater com a assinatura
  const supabase = createServerClient(
    process.env.SUPABASE_URL!, // <-- CORRETO
    process.env.SUPABASE_ANON_KEY!, // <-- AQUI USE ANON KEY
    { cookies: cookieMethods } as any
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/profissional/:path*",
    "/recepcao/:path*",
    "/api/:path*",
  ],
};
