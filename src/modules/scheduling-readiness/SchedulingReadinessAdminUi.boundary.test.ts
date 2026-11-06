import fs from "node:fs";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync("src/app/admin/settings/scheduling-readiness/page.tsx", "utf8");
const settings = fs.readFileSync("src/app/admin/settings/page.tsx", "utf8");

describe("scheduling readiness admin UI boundary", () => {
  it("offers the readiness checker from settings", () => {
    expect(settings).toContain('title: "Verificação da agenda"');
    expect(settings).toContain('href: "/admin/settings/scheduling-readiness"');
    expect(page).toContain('title="Verificação da agenda"');
  });

  it("queries the read-only endpoint with the three selected identifiers", () => {
    expect(page).toContain('new URLSearchParams(selection)');
    expect(page).toContain('/api/v1/scheduling/readiness?');
    expect(page).toContain('cache: "no-store"');
    for (const value of ["unitId", "serviceId", "professionalId", "readiness.checks"]) expect(page).toContain(value);
    for (const method of ['method: "POST"', 'method: "PUT"', 'method: "DELETE"']) expect(page).not.toContain(method);
  });

  it("explains every check and provides corrective navigation", () => {
    for (const value of ["Local ativo", "Serviço ativo", "Duração do serviço", "Profissional ativo", "Profissional no local", "Profissional no serviço", "Horário de atendimento", "Distribuição coberta pelo horário", "Corrigir configuração", "Revisar feriados e bloqueios"]) expect(page).toContain(value);
    expect(page).toContain("Nenhuma configuração foi alterada");
  });
});
