import { describe, expect, it, vi } from "vitest";
import { createCompanyUnit, getCompanyUnit, listCompanyUnits, updateCompanyUnit } from "./CompanyUnit.service";

const input = { code: "centro", name: "Centro", timeZone: "America/Sao_Paulo", phone: null, email: null, postalCode: null, street: null, number: null, complement: null, district: null, city: null, state: null, countryCode: "BR", isDefault: true, active: true };

describe("company unit service boundary", () => {
  it("requires the authenticated company for every operation", async () => {
    await expect(listCompanyUnits(" ", { list: vi.fn() })).rejects.toThrow("missing_company_id");
    await expect(createCompanyUnit(" ", input, { create: vi.fn() })).rejects.toThrow("missing_company_id");
  });

  it("never replaces ownership with unit input", async () => {
    const create = vi.fn().mockResolvedValue({ id: "unit-1" });
    await createCompanyUnit("company-a", input, { create });
    expect(create).toHaveBeenCalledWith("company-a", input);
  });

  it("scopes reads and updates by company and unit", async () => {
    const find = vi.fn().mockResolvedValue(null);
    const update = vi.fn().mockResolvedValue(null);
    await getCompanyUnit("company-a", "unit-1", { find });
    await updateCompanyUnit("company-a", "unit-1", input, { update });
    expect(find).toHaveBeenCalledWith("company-a", "unit-1");
    expect(update).toHaveBeenCalledWith("company-a", "unit-1", input);
  });
});
