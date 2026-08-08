import { and, eq } from "drizzle-orm";

import {
  commercialClients,
  subscriptions,
  subscriptionUsers,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type CommercialAccessDecision =
  | "unconfigured"
  | "allowed"
  | "restricted";

export type CommercialAccessReason =
  | "tenant_missing"
  | "subscription_missing"
  | "subscription_entitled"
  | "commercial_client_prospect"
  | "commercial_client_suspended"
  | "commercial_client_closed"
  | "subscription_pending"
  | "subscription_past_due"
  | "subscription_suspended"
  | "subscription_cancelled";

type CommercialClientStatus =
  (typeof commercialClients.status.enumValues)[number];
type SubscriptionStatus = (typeof subscriptions.status.enumValues)[number];

export type CommercialAccessContext = {
  decision: CommercialAccessDecision;
  reason: CommercialAccessReason;
  client: {
    id: string;
    legalName: string;
    tradeName: string | null;
    status: CommercialClientStatus;
  } | null;
  subscription: {
    id: string;
    planCode: string;
    status: SubscriptionStatus;
    provisioningStatus:
      | "pending"
      | "processing"
      | "completed"
      | "failed";
  } | null;
  user: {
    role: "owner" | "billing" | "administrator";
    isActive: boolean;
  } | null;
};

type CommercialAccessLifecycle = {
  clientStatus: CommercialClientStatus;
  subscriptionStatus: SubscriptionStatus;
};

const restrictedSubscriptionReasons = {
  pending: "subscription_pending",
  past_due: "subscription_past_due",
  suspended: "subscription_suspended",
  cancelled: "subscription_cancelled",
} satisfies Record<
  Exclude<SubscriptionStatus, "trial" | "active">,
  CommercialAccessReason
>;

export function evaluateCommercialAccess(
  lifecycle: CommercialAccessLifecycle,
): Pick<CommercialAccessContext, "decision" | "reason"> {
  if (lifecycle.clientStatus === "prospect") {
    return {
      decision: "restricted",
      reason: "commercial_client_prospect",
    };
  }

  if (lifecycle.clientStatus === "suspended") {
    return {
      decision: "restricted",
      reason: "commercial_client_suspended",
    };
  }

  if (lifecycle.clientStatus === "closed") {
    return {
      decision: "restricted",
      reason: "commercial_client_closed",
    };
  }

  if (
    lifecycle.subscriptionStatus === "trial" ||
    lifecycle.subscriptionStatus === "active"
  ) {
    return { decision: "allowed", reason: "subscription_entitled" };
  }

  return {
    decision: "restricted",
    reason: restrictedSubscriptionReasons[lifecycle.subscriptionStatus],
  };
}

const emptyContext = (
  reason: "tenant_missing" | "subscription_missing",
): CommercialAccessContext => ({
  decision: "unconfigured",
  reason,
  client: null,
  subscription: null,
  user: null,
});

export async function getCommercialAccessContext(input: {
  tenantId: string | null;
  userId: string;
}): Promise<CommercialAccessContext> {
  if (!input.tenantId) {
    return emptyContext("tenant_missing");
  }

  const db = getDb();
  const rows = await db
    .select({
      clientId: commercialClients.id,
      clientLegalName: commercialClients.legalName,
      clientTradeName: commercialClients.tradeName,
      clientStatus: commercialClients.status,
      subscriptionId: subscriptions.id,
      subscriptionPlanCode: subscriptions.planCode,
      subscriptionStatus: subscriptions.status,
      subscriptionProvisioningStatus: subscriptions.provisioningStatus,
      subscriptionUserRole: subscriptionUsers.role,
      subscriptionUserIsActive: subscriptionUsers.isActive,
    })
    .from(subscriptions)
    .innerJoin(
      commercialClients,
      eq(commercialClients.id, subscriptions.commercialClientId),
    )
    .leftJoin(
      subscriptionUsers,
      and(
        eq(subscriptionUsers.commercialClientId, commercialClients.id),
        eq(subscriptionUsers.userId, input.userId),
      ),
    )
    .where(eq(subscriptions.tenantId, input.tenantId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return emptyContext("subscription_missing");
  }

  const access = evaluateCommercialAccess({
    clientStatus: row.clientStatus,
    subscriptionStatus: row.subscriptionStatus,
  });

  return {
    ...access,
    client: {
      id: row.clientId,
      legalName: row.clientLegalName,
      tradeName: row.clientTradeName,
      status: row.clientStatus,
    },
    subscription: {
      id: row.subscriptionId,
      planCode: row.subscriptionPlanCode,
      status: row.subscriptionStatus,
      provisioningStatus: row.subscriptionProvisioningStatus,
    },
    user:
      row.subscriptionUserRole &&
      row.subscriptionUserIsActive !== null
        ? {
            role: row.subscriptionUserRole,
            isActive: row.subscriptionUserIsActive,
          }
        : null,
  };
}
