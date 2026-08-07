import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  cookieAdapter: null as null | {
    getAll: () => Array<{ name: string; value: string }>;
    setAll: (
      cookies: Array<{
        name: string;
        value: string;
        options?: Record<string, unknown>;
      }>,
    ) => void;
  },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { middlewareReal } from "./middleware";

describe("authentication middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookieAdapter = null;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    mocks.createServerClient.mockImplementation(
      (_url: string, _key: string, options: { cookies: typeof mocks.cookieAdapter }) => {
        mocks.cookieAdapter = options.cookies;
        return {
          auth: {
            getUser: mocks.getUser,
          },
        };
      },
    );
  });

  it("allows an authenticated user to access the admin area", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const request = new NextRequest("https://sisag.example.test/admin");
    const response = await middlewareReal(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an anonymous admin request to login", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest("https://sisag.example.test/admin");
    const response = await middlewareReal(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://sisag.example.test/login",
    );
  });

  it("propagates refreshed auth cookies to request and response", async () => {
    mocks.getUser.mockImplementation(async () => {
      mocks.cookieAdapter?.setAll([
        {
          name: "sb-auth-token",
          value: "refreshed-token",
          options: { httpOnly: true, path: "/", sameSite: "lax" },
        },
      ]);

      return {
        data: { user: { id: "user-1" } },
        error: null,
      };
    });

    const request = new NextRequest("https://sisag.example.test/admin");
    const response = await middlewareReal(request);

    expect(mocks.cookieAdapter?.getAll()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "sb-auth-token",
          value: "refreshed-token",
        }),
      ]),
    );
    expect(response.cookies.get("sb-auth-token")?.value).toBe(
      "refreshed-token",
    );
  });
});
