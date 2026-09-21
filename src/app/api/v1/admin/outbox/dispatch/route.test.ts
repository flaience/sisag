import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ dispatch: vi.fn(), db: vi.fn() }));
vi.mock("@/modules/outbox/OutboxDispatcher", () => ({
  OutboxDispatcher: { dispatchOnce: mocks.dispatch },
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.db, getPool: mocks.db }));
import { POST } from "./route";

describe("retired admin outbox dispatcher", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());
  it.each([
    ["anonymous", "{}", {}],
    ["authorization header", '{"limit":10}', { authorization: "Bearer synthetic-only" }],
    ["malformed JSON", "{", {}],
    ["large requested batch", '{"limit":1000000}', {}],
  ])("refuses %s without touching the queue", async (_name, body, headers) => {
    const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden"));
    const request = new Request("http://localhost/api/v1/admin/outbox/dispatch", {
      method: "POST", body, headers: headers as HeadersInit,
    });
    const parse = vi.spyOn(request, "json");
    const response = await POST(request);
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "legacy_outbox_dispatch_disabled" });
    expect(parse).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.db).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });
});
