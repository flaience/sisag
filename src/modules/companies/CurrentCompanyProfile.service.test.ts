import { describe, expect, it, vi } from "vitest";
import { choosePrimaryLocationCode, getCurrentCompanyProfile, updateCurrentCompanyProfile } from "./CurrentCompanyProfile.service";

const profile = { id: "tenant-a", name: "Empresa A", document: null, address: null, phone: null, email: null, businessType: "sisag" };

describe("current company profile service", () => {
  it("reads only the company supplied by authenticated context", async () => {
    const find = vi.fn().mockResolvedValue(profile);
    await expect(getCurrentCompanyProfile("tenant-a", { find })).resolves.toEqual(profile);
    expect(find).toHaveBeenCalledWith("tenant-a");
  });
  it("updates only the company supplied by authenticated context", async () => {
    const update = vi.fn().mockResolvedValue(profile);
    const input = { name: "Empresa A", document: null, address: null, phone: null, email: null, businessType: "sisag" as const };
    await updateCurrentCompanyProfile("tenant-a", input, { update });
    expect(update).toHaveBeenCalledWith("tenant-a", input);
  });
  it("chooses a unique stable code for the automatic primary location", () => {
    expect(choosePrimaryLocationCode("Clínica São José", [])).toBe("clinica-sao-jose");
    expect(choosePrimaryLocationCode("Clínica São José", ["clinica-sao-jose", "clinica-sao-jose-2"])).toBe("clinica-sao-jose-3");
  });
  it("rejects an absent company boundary", async () => {
    await expect(getCurrentCompanyProfile(" ", { find: vi.fn() })).rejects.toThrow("missing_company_id");
  });
});
