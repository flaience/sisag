import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireApiRole: vi.fn(), getDb: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.requireApiRole }));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));

import { GET } from "./route";

describe("professionals tenant boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated listing before reaching the database", async () => {
    mocks.requireApiRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET(new Request(
      "https://sisag.test/api/v1/professionals?companyId=foreign-company",
    ) as never);

    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
