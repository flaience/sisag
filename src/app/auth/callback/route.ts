import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = "https://xzjfwxilejgqwttbcwkd.supabase.co";

const SUPABASE_ANON_KEY = "COLE_AQUI_A_ANON_KEY_REAL_COMPLETA";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/reset-password";

  if (!code) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin));

  const cookieStore = await cookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const redirectUrl = new URL("/forgot-password", requestUrl.origin);
    redirectUrl.searchParams.set(
      "error",
      error.message || "Link de recuperação inválido ou expirado.",
    );

    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
