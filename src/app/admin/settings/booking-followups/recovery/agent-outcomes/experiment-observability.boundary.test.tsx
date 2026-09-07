import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("retrieval experiment observability UI", () => {
  const page = fs.readFileSync("src/app/admin/settings/booking-followups/recovery/agent-outcomes/page.tsx", "utf8");

  it("shows governed experiment metrics", () => {
    for (const value of ["Experimentos de retrieval", "selectionRate", "successRate", "fallbackRuns", "averageTokens", "p95DurationMs", "averageOverlapRate"]) expect(page).toContain(value);
  });

  it("shows failures and a safe empty state", () => {
    expect(page).toContain("Falhas:");
    expect(page).toContain("Nenhuma execução vinculada a experimento no período");
  });

  it("keeps promotion and official retrieval outside the UI", () => {
    expect(page).toContain("decisão humana");
    expect(page).toContain("Não promovem configurações");
    expect(page).toContain("retrieval oficial");
  });
});
