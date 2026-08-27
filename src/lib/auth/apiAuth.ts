import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext } from "@/lib/auth/getAuthenticatedUserContext";
import { hasSomeRole, type AppRole } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export type ApiAuthContext = {
  userId: string;
  companyId: string;
  tenantId: string | null;
  role: AppRole;
  name: string | null;
};

async function getAccessTokenFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const legacyToken = request.cookies.get("sb-access-token")?.value;
  if (legacyToken) return legacyToken;

  const supabase = await getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}
export async function getApiAuthContext(
  request: NextRequest,
): Promise<ApiAuthContext | null> {
  const accessToken = await getAccessTokenFromRequest(request);
  const auth = await getAuthenticatedUserContext(accessToken);

  if (!auth?.userId || !auth.companyId || !auth.role) {
    return null;
  }

  return {
    userId: auth.userId,
    companyId: auth.companyId,
    tenantId: auth.tenantId,
    role: auth.role,
    name: auth.name,
  };
}

export async function requireApiAuth(
  request: NextRequest,
): Promise<
  { ok: true; auth: ApiAuthContext } | { ok: false; response: NextResponse }
> {
  const auth = await getApiAuthContext(request);

  if (!auth) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, auth };
}

export async function requireApiRole(
  request: NextRequest,
  allowedRoles: AppRole[],
): Promise<
  { ok: true; auth: ApiAuthContext } | { ok: false; response: NextResponse }
> {
  const auth = await getApiAuthContext(request);

  if (!auth) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!hasSomeRole(auth.role, allowedRoles)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, auth };
}
