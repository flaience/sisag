import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware REAL
 */
async function middlewareReal(req: NextRequest) {
  // resposta padrão
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: req.cookies, // <-- *** ESSENCIAL: a versão antiga exige isto ***
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

/**
 * Middleware BYPASS no build
 */
function middlewareBypass() {
  return NextResponse.next();
}

export const middleware =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? middlewareReal
    : middlewareBypass;

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};
