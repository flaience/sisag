import { redirect } from "next/navigation";

import type {
  CommercialAccessContext,
  CommercialAccessReason,
} from "@/modules/commercial/commercial-access.service";

export type CommercialAccessEnforcement =
  | { allowed: true; mode: "entitled" | "legacy_compatibility" }
  | { allowed: false; reason: CommercialAccessReason };

export function evaluateCommercialAccessEnforcement(
  access: CommercialAccessContext,
): CommercialAccessEnforcement {
  if (access.decision === "restricted") {
    return { allowed: false, reason: access.reason };
  }

  return {
    allowed: true,
    mode:
      access.decision === "allowed"
        ? "entitled"
        : "legacy_compatibility",
  };
}

export function requireCommercialAccess(access: CommercialAccessContext) {
  const enforcement = evaluateCommercialAccessEnforcement(access);

  if ("reason" in enforcement) {
    redirect(
      `/access-restricted?reason=${encodeURIComponent(enforcement.reason)}`,
    );
  }

  return enforcement;
}
