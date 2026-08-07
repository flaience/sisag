import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LoginInputSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(1024),
});

function invalidPayloadResponse() {
  return NextResponse.json(
    { ok: false, error: "invalid_credentials_payload" },
    { status: 400 },
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return invalidPayloadResponse();
  }

  const parsed = LoginInputSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayloadResponse();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "Serviço de autenticação indisponível." },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { email, password } = parsed.data;

  if (!email || !password) {
    return invalidPayloadResponse();
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    return NextResponse.json(
      { ok: false, error: "E-mail ou senha inválidos." },
      { status: 401 },
    );
  }

  return response;
}
