import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("arrival intention admin API boundary", () => {
  const collection = fs.readFileSync("src/app/api/v1/scheduling/arrival-intentions/route.ts", "utf8");
  const item = fs.readFileSync("src/app/api/v1/scheduling/arrival-intentions/[id]/route.ts", "utf8");
  it("derives company and source from trusted server context", () => {
    expect(collection).toContain("auth.auth.companyId");
    expect(collection).toContain('source: "admin"');
    expect(collection).not.toContain("companyId: parsed.data");
  });
  it("allows staff to read and only owner or admin to mutate", () => {
    expect(collection).toContain('["owner", "admin", "staff"]');
    expect(collection.split('["owner", "admin"]').length - 1).toBe(1);
    expect(item.split('["owner", "admin"]').length - 1).toBe(1);
  });
  it("offers registration listing and cancellation without queue operations", () => {
    for (const value of ["listArrivalIntentions", "registerArrivalIntention", "cancelArrivalIntention"]) expect(collection + item).toContain(value);
    for (const value of ["checkIn", "queuePosition", "callNext"]) expect(collection + item).not.toContain(value);
  });
});
