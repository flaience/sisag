import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn((location: string) => {
    throw new Error(`redirect:${location}`);
  }),
  supabaseAdmin: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: mocks.supabaseAdmin }));

import { isPlatformRole, requirePlatformOperator } from "./requirePlatformOperator";

function user(platformRole: unknown, overrides: Record<string, unknown> = {}) {
  return {
    id: "operator-1",
    email: "operator@sisag.test",
    app_metadata: { platform_role: platformRole },
    user_metadata: { name: "Operador SISAG" },
    ...overrides,
  };
}

describe("requirePlatformOperator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.supabaseAdmin.mockReturnValue({ auth: { getUser: mocks.getUser } });
  });

  it.each(["operator", "admin"] as const)("allows the %s platform role", async (role) => {
    mocks.getUser.mockResolvedValue({
      data: { user: user(role) },
      error: null,
    });

    await expect(requirePlatformOperator("valid-token")).resolves.toEqual({
      userId: "operator-1",
      email: "operator@sisag.test",
      name: "Operador SISAG",
      role,
    });
    expect(mocks.getUser).toHaveBeenCalledWith("valid-token");
  });

  it("redirects an absent session to login before calling Supabase", async () => {
    await expect(requirePlatformOperator()).rejects.toThrow("redirect:/login");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("redirects an invalid token to login", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid token"),
    });
    await expect(requirePlatformOperator("invalid-token")).rejects.toThrow("redirect:/login");
  });

  it.each([undefined, null, "owner", "staff"])(
    "rejects a non-platform role: %s",
    async (role) => {
      mocks.getUser.mockResolvedValue({
        data: { user: user(role) },
        error: null,
      });
      await expect(requirePlatformOperator("valid-token"))
        .rejects.toThrow("redirect:/unauthorized");
    },
  );

  it("normalizes optional identity fields", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: user("operator", {
          email: undefined,
          user_metadata: { full_name: "  Suporte SISAG  " },
        }),
      },
      error: null,
    });
    await expect(requirePlatformOperator("valid-token")).resolves.toMatchObject({
      email: null,
      name: "Suporte SISAG",
    });
  });

  it("recognizes only supported platform roles", () => {
    expect(isPlatformRole("operator")).toBe(true);
    expect(isPlatformRole("admin")).toBe(true);
    expect(isPlatformRole("owner")).toBe(false);
    expect(isPlatformRole(null)).toBe(false);
  });
});
