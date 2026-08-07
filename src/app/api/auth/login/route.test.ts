import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  signInWithPassword: vi.fn(),
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

import { POST } from "./route";

function request(body: unknown) {
  return new NextRequest("https://sisag.example.test/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST auth login", () => {
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
            signInWithPassword: mocks.signInWithPassword,
          },
        };
      },
    );
  });

  it("rejects an invalid payload before calling Supabase", async () => {
    const response = await POST(request({ email: "invalid", password: "" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "invalid_credentials_payload",
    });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("maps rejected credentials to an unauthenticated response", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const response = await POST(
      request({ email: "user@example.com", password: "secret-value" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "E-mail ou senha inválidos.",
    });
  });

  it("creates the session and returns its cookies", async () => {
    mocks.signInWithPassword.mockImplementation(async () => {
      mocks.cookieAdapter?.setAll([
        {
          name: "sb-auth-token",
          value: "session-token",
          options: {
            httpOnly: true,
            path: "/",
            sameSite: "lax",
            secure: true,
          },
        },
      ]);

      return {
        data: {
          user: { id: "user-1" },
          session: { access_token: "session-token" },
        },
        error: null,
      };
    });

    const response = await POST(
      request({ email: " USER@example.com ", password: "secret-value" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret-value",
    });
    expect(response.headers.get("set-cookie")).toContain(
      "sb-auth-token=session-token",
    );
  });

  it("rejects malformed JSON", async () => {
    const malformedRequest = new NextRequest(
      "https://sisag.example.test/api/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      },
    );

    const response = await POST(malformedRequest);

    expect(response.status).toBe(400);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
});
