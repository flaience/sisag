import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { profiles, companies } from "@/drizzle/schema";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { ok: false, error: "unauthenticated" },
        { status: 401 },
      );
    }

    const db = getDb();

    const profileRows = await db
      .select({
        id: profiles.id,
        tenantId: profiles.tenantId,
        companyId: profiles.companyId,
        role: profiles.role,
        name: profiles.name,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    const profile = profileRows[0] ?? null;

    let company = null;

    if (profile?.companyId) {
      const companyRows = await db
        .select({
          id: companies.id,
          tenantId: companies.tenantId,
          name: companies.name,
          documentNumber: companies.documentNumber,
          phone: companies.phone,
          email: companies.email,
          businessType: companies.businessType,
        })
        .from(companies)
        .where(eq(companies.id, profile.companyId))
        .limit(1);

      company = companyRows[0] ?? null;
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email ?? null,
        name:
          user.user_metadata?.name ??
          user.user_metadata?.full_name ??
          profile?.name ??
          null,
      },
      profile,
      company,
    });
  } catch (err: any) {
    console.error("AUTH CONTEXT ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Erro ao carregar contexto de autenticação.",
      },
      { status: 400 },
    );
  }
}
