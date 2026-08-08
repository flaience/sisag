import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("node:fs", () => ({
  readFileSync: mocks.readFileSync,
}));

import { supabaseAdmin } from "./supabase-admin";

describe("supabaseAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    mocks.createClient.mockReturnValue({ kind: "admin-client" });
  });

  it("prefers the environment variable in local environments", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "environment-service-key";

    const result = supabaseAdmin();

    expect(mocks.readFileSync).not.toHaveBeenCalled();
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://supabase.example.test",
      "environment-service-key",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
    expect(result).toEqual({ kind: "admin-client" });
  });

  it("reads the service key from the Docker secret in production", () => {
    mocks.readFileSync.mockReturnValue("docker-service-key\n");

    supabaseAdmin();

    expect(mocks.readFileSync).toHaveBeenCalledWith(
      "/run/secrets/supabase_service_role_key",
      "utf8",
    );
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://supabase.example.test",
      "docker-service-key",
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  });

  it("fails without exposing credentials when no service key is configured", () => {
    mocks.readFileSync.mockImplementation(() => {
      throw new Error("file not found");
    });

    expect(() => supabaseAdmin()).toThrow(
      "Supabase Admin: Missing runtime configuration!",
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("fails when the Supabase URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    mocks.readFileSync.mockReturnValue("docker-service-key");

    expect(() => supabaseAdmin()).toThrow(
      "Supabase Admin: Missing runtime configuration!",
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
