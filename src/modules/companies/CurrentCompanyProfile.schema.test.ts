import { describe, expect, it } from "vitest";
import { CurrentCompanyProfileInputSchema } from "./CurrentCompanyProfile.schema";
describe("current company profile input", () => {
  it("normalizes optional operational fields", () => {
    expect(CurrentCompanyProfileInputSchema.parse({ name: " Clínica Centro ", email: "", phone: "" })).toMatchObject({ name: "Clínica Centro", email: null, phone: null, businessType: "generic" });
  });
  it("normalizes legacy business types during migration", () => {
    expect(CurrentCompanyProfileInputSchema.parse({ name: "Clínica Centro", businessType: "clinic" }).businessType).toBe("sisag");
    expect(CurrentCompanyProfileInputSchema.parse({ name: "Espaço Bem-estar", businessType: "beauty" }).businessType).toBe("salon");
  });
  it("rejects invalid names and emails", () => {
    expect(CurrentCompanyProfileInputSchema.safeParse({ name: "A", email: "invalid" }).success).toBe(false);
  });
});
