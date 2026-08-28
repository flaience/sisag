import { describe, expect, it, vi } from "vitest";
import { deactivateProfessionalUnit, linkProfessionalUnit, listProfessionalUnits } from "./ProfessionalUnit.service";
describe("professional unit service boundary", () => {
  it("scopes reads to company and professional", async () => { const list = vi.fn().mockResolvedValue([]); await listProfessionalUnits("company-a", "professional-a", { list }); expect(list).toHaveBeenCalledWith("company-a", "professional-a"); });
  it("scopes links and deactivation", async () => { const link = vi.fn().mockResolvedValue({}); const input = { unitId: "unit-a", isPrimary: true }; await linkProfessionalUnit("company-a", "professional-a", input, { link }); expect(link).toHaveBeenCalledWith("company-a", "professional-a", input); const deactivate = vi.fn().mockResolvedValue({}); await deactivateProfessionalUnit("company-a", "professional-a", "unit-a", { deactivate }); expect(deactivate).toHaveBeenCalledWith("company-a", "professional-a", "unit-a"); });
  it("rejects an absent company boundary", async () => { await expect(listProfessionalUnits(" ", "professional-a", { list: vi.fn() })).rejects.toThrow("missing_company_id"); });
});
