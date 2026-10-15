import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync("src/app/admin/settings/agent-handoffs/page.tsx", "utf8");

describe("agent human handoff management page", () => {
  it("loads the active sanitized queue without caching", () => {
    expect(source).toContain("/api/v1/settings/agent-shadow/handoffs?status=active&limit=50");
    expect(source).toContain('cache: "no-store"');
    for (const forbidden of ["senderKey", "phone", "message", "transcript"]) expect(source).not.toContain(forbidden);
  });
  it("requires confirmation for every state transition", () => {
    expect(source).toContain("window.confirm");
    for (const action of ['"claim"', '"resolve"', '"dismiss"']) expect(source).toContain(action);
  });
  it("allows only the claiming operator to see completion actions", () => {
    expect(source).toContain('item.status === "claimed" && item.claimedByCurrentUser');
    expect(source).toContain("Atendimento assumido por outro operador.");
  });
});