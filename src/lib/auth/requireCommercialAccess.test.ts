import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import {
  evaluateCommercialAccessEnforcement,
  requireCommercialAccess,
} from "./requireCommercialAccess";
import type { CommercialAccessContext } from "@/modules/commercial/commercial-access.service";

const context = (
  decision: CommercialAccessContext["decision"],
  reason: CommercialAccessContext["reason"],
): CommercialAccessContext => ({
  decision,
  reason,
  client: null,
  subscription: null,
  user: null,
});

describe("commercial access enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
  });

  it("allows entitled subscriptions", () => {
    expect(
      evaluateCommercialAccessEnforcement(
        context("allowed", "subscription_entitled"),
      ),
    ).toEqual({ allowed: true, mode: "entitled" });
  });

  it.each(["tenant_missing", "subscription_missing"] as const)(
    "keeps %s in legacy compatibility mode",
    (reason) => {
      expect(
        evaluateCommercialAccessEnforcement(context("unconfigured", reason)),
      ).toEqual({ allowed: true, mode: "legacy_compatibility" });
    },
  );

  it.each([
    "commercial_client_prospect",
    "commercial_client_suspended",
    "commercial_client_closed",
    "subscription_pending",
    "subscription_past_due",
    "subscription_suspended",
    "subscription_cancelled",
  ] as const)("blocks %s with a recoverable redirect", (reason) => {
    expect(() =>
      requireCommercialAccess(context("restricted", reason)),
    ).toThrow(`NEXT_REDIRECT:/access-restricted?reason=${reason}`);
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/access-restricted?reason=${reason}`,
    );
  });
});
