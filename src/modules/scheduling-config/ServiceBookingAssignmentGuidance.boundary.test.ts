import fs from "node:fs";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync("src/app/admin/settings/service-assignments/page.tsx", "utf8");
const settings = fs.readFileSync("src/app/admin/settings/page.tsx", "utf8");

describe("service booking assignment guidance", () => {
  it("distinguishes assignment rules from professional availability", () => {
    for (const value of ["Esta tela não cria a jornada de trabalho do profissional", "Esta regra só distribui os agendamentos", "Profissionais → Disponibilidade", "Configurar horários deste profissional"]) expect(page).toContain(value);
    expect(settings).toContain("Os horários de trabalho são cadastrados no profissional");
  });

  it("guides required selections before saving", () => {
    expect(page).toContain("Selecione primeiro o local de atendimento");
    expect(page).toContain("Selecione o profissional preferencial para esta regra");
    expect(page).toContain("disabled={saving || !form.unitId || !form.professionalId}");
  });
});
