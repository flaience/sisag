import { describe, expect, it } from "vitest";
import { CompanyUnitInputSchema } from "./CompanyUnit.schema";

describe("company unit input", () => {
  it("normalizes the operational identity and safe defaults", () => {
    expect(CompanyUnitInputSchema.parse({ code: " CENTRO-01 ", name: " Unidade Centro ", email: "" })).toMatchObject({
      code: "centro-01",
      name: "Unidade Centro",
      email: null,
      timeZone: "America/Sao_Paulo",
      countryCode: "BR",
      isDefault: false,
      active: true,
    });
  });

  it("rejects ambiguous codes, invalid countries, and invalid emails", () => {
    expect(CompanyUnitInputSchema.safeParse({ code: "Centro Sul", name: "Centro", countryCode: "BRA" }).success).toBe(false);
    expect(CompanyUnitInputSchema.safeParse({ code: "centro", name: "Centro", email: "invalid" }).success).toBe(false);
  });
});
