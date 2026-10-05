import fs from "node:fs";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync("src/app/admin/settings/agent-knowledge/page.tsx", "utf8");
const settings = fs.readFileSync("src/app/admin/settings/page.tsx", "utf8");

describe("n8n agent RAG knowledge management UI boundary", () => {
  it("places the screen in the authenticated settings tree", () => {
    expect(settings).toContain('href: "/admin/settings/agent-knowledge"');
    expect(settings).toContain('title: "Conhecimento do agente WhatsApp"');
  });

  it("uses only the authenticated knowledge management API", () => {
    expect(page).toContain('fetch("/api/v1/settings/agent-knowledge"');
    expect(page).toContain('"/api/v1/settings/agent-knowledge/" + item.id + "/status"');
    expect(page).not.toContain("/api/platform/agents/n8n/read-only");
  });

  it("keeps publishing explicit and state constrained", () => {
    expect(page).toContain("window.confirm");
    expect(page).toContain('action: "approve" | "retire"');
    expect(page).toContain('item.status === "draft"');
    expect(page).toContain('item.status === "approved"');
    expect(page).toContain("Criar um rascunho não o publica");
  });

  it("shows provenance, version, validity and immutable hash", () => {
    for (const value of ["sourceType", "sourceRef", "item.version", "item.validFrom", "item.validUntil", "item.contentHash", "SHA-256", "maxLength={8000}"]) {
      expect(page).toContain(value);
    }
  });
});
