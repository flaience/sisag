import fs from "node:fs";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync("src/app/admin/settings/scheduling-readiness/page.tsx", "utf8");
const component = fs.readFileSync("src/app/admin/settings/scheduling-readiness/SchedulingReadinessSpecificTime.tsx", "utf8");

describe("scheduling readiness specific time boundary", () => {
  it("appears only after structural readiness", () => {
    expect(page).toContain("readiness.ready ? <SchedulingReadinessSpecificTime");
    expect(page).toContain("unitId={selection.unitId}");
    expect(page).toContain("serviceId={selection.serviceId}");
    expect(page).toContain("professionalId={selection.professionalId}");
  });
  it("uses the official read-only service availability query", () => {
    expect(component).toContain("/api/v1/scheduling/service-available?");
    expect(component).toContain('cache: "no-store"');
    expect(component).toContain("Nenhum horário será reservado");
    for (const method of ['method: "POST"', 'method: "PUT"', 'method: "DELETE"']) expect(component).not.toContain(method);
  });
  it("explains assignment and offers same-professional alternatives", () => {
    expect(component).toContain("a distribuição direcionou o atendimento");
    expect(component).toContain("Alternativas encontradas");
    expect(component).toContain("fora da jornada, bloqueado, ocupado ou não coberto pela distribuição");
  });
});
