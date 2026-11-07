import fs from "node:fs";
import { describe, expect, it } from "vitest";
const page = fs.readFileSync("src/app/admin/settings/scheduling-readiness/page.tsx", "utf8");
const component = fs.readFileSync("src/app/admin/settings/scheduling-readiness/SchedulingReadinessSpecificTime.tsx", "utf8");
describe("scheduling readiness specific time diagnosis UI boundary", () => {
  it("appears once only after structural readiness", () => { expect(page.match(/import \{ SchedulingReadinessSpecificTime \}/g)).toHaveLength(1); expect(page.match(/readiness\.ready \? <SchedulingReadinessSpecificTime/g)).toHaveLength(1); for (const value of ["unitId={selection.unitId}", "serviceId={selection.serviceId}", "professionalId={selection.professionalId}"]) expect(page).toContain(value); });
  it("uses only the authenticated no-store diagnosis GET", () => { expect(component).toContain("/api/v1/scheduling/readiness/specific-time?"); expect(component).toContain('cache: "no-store"'); expect(component).toContain("new URLSearchParams({ unitId, serviceId, professionalId, date, time })"); for (const method of ['method: "POST"', 'method: "PUT"', 'method: "PATCH"', 'method: "DELETE"']) expect(component).not.toContain(method); });
  it("explains every diagnosis and provides corrective navigation", () => { for (const value of ["Horário fora da jornada do profissional", "Horário fora da distribuição por turno", "Horário direcionado para outro profissional", "Horário indisponível após validar jornada e distribuição", "Alternativas mais próximas", "Corrigir jornada do profissional", "Corrigir distribuição por turno", "Revisar feriados e bloqueios", "Nenhum horário será reservado ou alterado"]) expect(component).toContain(value); });
});
