import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = "https://xzjfwxilejgqwttbcwkd.supabase.co";

const SUPABASE_ANON_KEY = "COLE_AQUI_A_ANON_KEY_REAL_COMPLETA";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") ?? "/reset-password";

  const appUrl = "https://sisag.flaience.com";

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(
      `${appUrl}/forgot-password?error=invalid_link`,
    );
  }

  const response = NextResponse.redirect(`${appUrl}${next}`);

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

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/forgot-password?error=${encodeURIComponent(error.message)}`,
    );
  }

  return response;
}
