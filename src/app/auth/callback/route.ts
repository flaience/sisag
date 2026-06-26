import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = "https://xzjfwxilejgqwttbcwkd.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6amZ3eGlsZWpncXd0dGJjd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTAzNzIsImV4cCI6MjA3ODM4NjM3Mn0.uwccV3BnJ2SwH8y1mKwboZlACT5vClJi7QCwe-3RtqI";

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
