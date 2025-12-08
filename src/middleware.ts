// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware REAL — só é executado quando estamos em tempo de execução real,
 * nunca durante build do Next / Docker.
 */
async function middlewareReal(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          res.cookies.set(name, value, options);
        },
        remove(name: string, options?: any) {
          res.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proteção da área restrita
  if (!user && req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

/**
 * Middleware BYPASS — usado durante o build (não executa Supabase)
 */
function middlewareBypass() {
  return NextResponse.next();
}

/**
 * Evita erro no build do Docker/Next:
 * o middleware real só roda SE as variáveis existem **em tempo de execução**.
 */
export const middleware =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? middlewareReal
    : middlewareBypass;

/**
 * Configuração — torna o middleware completamente dinâmico
 */
export const config = {
  matcher: ["/admin/:path*"], // protege APENAS rotas admin
  runtime: "nodejs", // impede edge build com SSR
};
