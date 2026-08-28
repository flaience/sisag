import { describe, expect, it } from "vitest";
import {
  COMPANY_BUSINESS_TYPE_OPTIONS,
  getCompanyBusinessTypeLabel,
  isCompanyBusinessType,
  normalizeCompanyBusinessTypeValue,
} from "./CompanyBusinessType";

describe("company business type presentation", () => {
  it("never exposes the generic technical value", () => {
    expect(getCompanyBusinessTypeLabel("generic")).toBe("Outros serviços");
    expect(COMPANY_BUSINESS_TYPE_OPTIONS.map((item) => item.label)).not.toContain("generic");
  });

  it("uses only business types recognized by the product vocabulary", () => {
    expect(COMPANY_BUSINESS_TYPE_OPTIONS.every((item) => isCompanyBusinessType(item.value))).toBe(true);
    expect(normalizeCompanyBusinessTypeValue("clinic")).toBe("sisag");
    expect(normalizeCompanyBusinessTypeValue("beauty")).toBe("salon");
    expect(getCompanyBusinessTypeLabel("clinic")).toBe("Clínica ou consultório");
  });
});
