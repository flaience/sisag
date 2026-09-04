import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("retrieval quality gate presentation", () => {
  const page = fs.readFileSync("src/app/admin/settings/booking-followups/recovery/agent-outcomes/page.tsx", "utf8");
  it("shows every conservative state", () => {
    for (const value of ["Dados insuficientes", "Manter em sombra", "Elegível para revisão humana"]) expect(page).toContain(value);
  });
  it("makes the human decision boundary visible", () => {
    expect(page).toContain("Nenhuma promoção é automática");
    expect(page).toContain("sinal correlacional");
    expect(page).toContain("não um rótulo de relevância vetorial");
  });
});
