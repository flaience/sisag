import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: vi.fn(), dispatch: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: mocks.db, getPool: mocks.db }));
vi.mock("@/modules/outbox/OutboxDispatcher", () => ({ OutboxDispatcher: { dispatchOnce: mocks.dispatch } }));
import { POST } from "./route";

describe("retired integration/webhook", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());
  it.each([
    ["anonymous", "{}", {}],
    ["authorization supplied", '{"limit":10}', { authorization: "Bearer synthetic-only" }],
    ["malformed JSON", "{", {}],
    ["large batch", '{"limit":1000000}', {}],
  ])("returns 410 for %s without effects", async (_label, body, headers) => {
    const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden"));
    const request = new Request("http://localhost/api/v1/integration/webhook", {
      method: "POST", body, headers: headers as HeadersInit,
    });
    const parse = vi.spyOn(request, "json");
    const response = await POST(request);
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "legacy_outbox_dispatch_disabled" });
    expect(parse).not.toHaveBeenCalled();
    expect(mocks.db).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });
});
