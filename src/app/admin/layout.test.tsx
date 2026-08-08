import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  requireAdminAccess: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

vi.mock("@/lib/auth/requireAdminAccess", () => ({
  requireAdminAccess: mocks.requireAdminAccess,
}));

vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => children,
}));

import AdminLayout from "./layout";

describe("AdminLayout authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockResolvedValue({
      auth: {
        getSession: mocks.getSession,
      },
    });
    mocks.requireAdminAccess.mockResolvedValue({
      userId: "user-1",
      companyId: "company-1",
      tenantId: "tenant-1",
      role: "owner",
      name: "Luis",
    });
  });

  it("authorizes the admin layout with the SSR session access token", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "current-access-token",
        },
      },
      error: null,
    });

    await AdminLayout({ children: "protected-content" });

    expect(mocks.getSupabaseServerClient).toHaveBeenCalledOnce();
    expect(mocks.getSession).toHaveBeenCalledOnce();
    expect(mocks.requireAdminAccess).toHaveBeenCalledWith(
      "current-access-token",
    );
  });

  it("does not reuse a legacy cookie when the SSR session is absent", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await AdminLayout({ children: "protected-content" });

    expect(mocks.requireAdminAccess).toHaveBeenCalledWith("");
  });
});
