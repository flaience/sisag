import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { profiles, companyUsers } from "@/drizzle/schema";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAppRole, type AppRole } from "@/lib/auth/permissions";
import {
  getCommercialAccessContext,
  type CommercialAccessContext,
} from "@/modules/commercial/commercial-access.service";

type AuthenticatedUserContext = {
  userId: string;
  companyId: string | null;
  tenantId: string | null;
  role: AppRole | null;
  name: string | null;
  commercialAccess: CommercialAccessContext;
};

export async function getAuthenticatedUserContext(
  accessToken?: string,
): Promise<AuthenticatedUserContext | null> {
  if (!accessToken) return null;

  const db = getDb();
  const admin = supabaseAdmin();

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const profile = profileRows[0] ?? null;

  const membershipRows = await db
    .select()
    .from(companyUsers)
    .where(
      and(eq(companyUsers.userId, user.id), eq(companyUsers.isActive, true)),
    )
    .limit(1);

  const membership = membershipRows[0] ?? null;

  const role = isAppRole(membership?.role) ? membership.role : null;
  const tenantId = membership?.tenantId ?? profile?.tenantId ?? null;
  const commercialAccess = await getCommercialAccessContext({
    tenantId,
    userId: user.id,
  });

  return {
    userId: user.id,
    companyId: membership?.companyId ?? profile?.companyId ?? null,
    tenantId,
    role,
    name: profile?.name ?? null,
    commercialAccess,
  };
}
