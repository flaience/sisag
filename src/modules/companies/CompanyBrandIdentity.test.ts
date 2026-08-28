import { describe, expect, it } from "vitest";
import { CompanyBrandIdentityInputSchema } from "./CompanyBrandIdentity.schema";
import { getCompanyDisplayName, getCompanyInitials } from "./CompanyBrandIdentity.presentation";

describe("company brand identity", () => {
  it("prefers the trade name and produces a compact fallback", () => {
    const company = { name: "Empresa Legal Ltda.", tradeName: "Clínica Vida Plena" };
    expect(getCompanyDisplayName(company)).toBe("Clínica Vida Plena");
    expect(getCompanyInitials(company)).toBe("CP");
  });

  it("falls back to the current company name", () => {
    expect(getCompanyDisplayName({ name: "Espaço Bela" })).toBe("Espaço Bela");
    expect(getCompanyInitials({ name: "Espaço Bela" })).toBe("EB");
  });

  it("accepts only internal safe logo paths", () => {
    expect(CompanyBrandIdentityInputSchema.parse({ tradeName: " Clínica Vida ", logoPath: "company-branding/company-1/logo.webp" })).toEqual({ tradeName: "Clínica Vida", logoPath: "company-branding/company-1/logo.webp" });
    for (const logoPath of ["https://example.com/logo.png", "/absolute/logo.png", "company/../secret", "company logo.png"]) {
      expect(CompanyBrandIdentityInputSchema.safeParse({ logoPath }).success).toBe(false);
    }
  });
});
