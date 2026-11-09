import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("scheduling readiness focused summary boundary", () => {
  const page = readFileSync("src/app/admin/settings/scheduling-readiness/page.tsx", "utf8");

  it("shows only missing configuration cards", () => {
    expect(page).toContain('readiness.checks.filter((item) => item.status === "missing").map');
    expect(page).not.toContain("Configuração encontrada e válida.");
  });

  it("keeps the ready path focused on the specific time check", () => {
    expect(page).toContain("readiness.ready ? <SchedulingReadinessSpecificTime");
    expect(page).toContain("corrija somente as pendências e teste um horário");
  });
});
