import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type PlatformRole = "operator" | "admin";

export type PlatformOperatorContext = {
  userId: string;
  email: string | null;
  name: string | null;
  role: PlatformRole;
};

export function isPlatformRole(value: unknown): value is PlatformRole {
  return value === "operator" || value === "admin";
}

export async function requirePlatformOperator(
  accessToken?: string,
): Promise<PlatformOperatorContext> {
  if (!accessToken) redirect("/login");

  const admin = supabaseAdmin();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(accessToken);

  if (error || !user) redirect("/login");

  const role = user.app_metadata?.platform_role;
  if (!isPlatformRole(role)) redirect("/unauthorized");

  const rawName = user.user_metadata?.name
    ?? user.user_metadata?.full_name
    ?? null;
  const name = typeof rawName === "string" && rawName.trim()
    ? rawName.trim()
    : null;

  return {
    userId: user.id,
    email: user.email ?? null,
    name,
    role,
  };
}
