import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

vi.mock("@/lib/auth/requireRole", () => ({
  requireRole: mocks.requireRole,
}));

import AdminSettingsLayout from "./layout";

describe("AdminSettingsLayout authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockResolvedValue({
      auth: { getSession: mocks.getSession },
    });
    mocks.requireRole.mockResolvedValue({ role: "owner" });
  });

  it("uses the current SSR session instead of a legacy cookie", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "current-access-token" } },
      error: null,
    });

    await AdminSettingsLayout({ children: "settings-content" });

    expect(mocks.getSupabaseServerClient).toHaveBeenCalledOnce();
    expect(mocks.getSession).toHaveBeenCalledOnce();
    expect(mocks.requireRole).toHaveBeenCalledWith({
      accessToken: "current-access-token",
      allowedRoles: ["owner", "admin"],
    });
  });

  it("passes an empty token to the centralized guard when no session exists", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await AdminSettingsLayout({ children: "settings-content" });
    expect(mocks.requireRole).toHaveBeenCalledWith({
      accessToken: "",
      allowedRoles: ["owner", "admin"],
    });
  });
});
