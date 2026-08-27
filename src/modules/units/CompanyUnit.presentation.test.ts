import { describe, expect, it } from "vitest";
import { buildCompanyUnitCode } from "./CompanyUnit.presentation";
describe("service location presentation", () => {
  it("generates a stable technical code without asking the user", () => {
    expect(buildCompanyUnitCode(" Clínica São José — Zona Sul ")).toBe("clinica-sao-jose-zona-sul");
  });
  it("keeps the code inside its persistence boundary", () => {
    expect(buildCompanyUnitCode("***")).toBe("local");
    expect(buildCompanyUnitCode("A".repeat(60))).toHaveLength(40);
  });
});
