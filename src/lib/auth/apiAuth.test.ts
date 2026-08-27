import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  getAuthenticatedUserContext: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/auth/getAuthenticatedUserContext", () => ({ getAuthenticatedUserContext: mocks.getAuthenticatedUserContext }));

import { getApiAuthContext, requireApiRole } from "./apiAuth";

function request({ bearer, legacy }: { bearer?: string; legacy?: string } = {}) {
  return {
    headers: { get: vi.fn().mockReturnValue(bearer ? `Bearer ${bearer}` : null) },
    cookies: { get: vi.fn().mockReturnValue(legacy ? { value: legacy } : undefined) },
  } as never;
}

const context = { userId: "user-1", companyId: "company-1", tenantId: "tenant-1", role: "admin", name: "Luis" };

describe("API authentication session boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockResolvedValue({ auth: { getSession: mocks.getSession } });
    mocks.getAuthenticatedUserContext.mockResolvedValue(context);
  });

  it("preserves bearer tokens for integrations", async () => {
    await getApiAuthContext(request({ bearer: "integration-token" }));
    expect(mocks.getAuthenticatedUserContext).toHaveBeenCalledWith("integration-token");
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("temporarily preserves the legacy cookie when present", async () => {
    await getApiAuthContext(request({ legacy: "legacy-token" }));
    expect(mocks.getAuthenticatedUserContext).toHaveBeenCalledWith("legacy-token");
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("uses the current SSR session for browser API requests", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "current-token" } }, error: null });
    await getApiAuthContext(request());
    expect(mocks.getSession).toHaveBeenCalledOnce();
    expect(mocks.getAuthenticatedUserContext).toHaveBeenCalledWith("current-token");
  });

  it("rejects absent sessions and disallowed roles", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.getAuthenticatedUserContext.mockResolvedValueOnce(null);
    expect((await requireApiRole(request(), ["owner"])).ok).toBe(false);
    mocks.getAuthenticatedUserContext.mockResolvedValueOnce(context);
    expect((await requireApiRole(request({ bearer: "token" }), ["owner"])).ok).toBe(false);
  });
});
