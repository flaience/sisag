import { describe, expect, it, vi } from "vitest";
import { getCurrentCompanyProfile, updateCurrentCompanyProfile } from "./CurrentCompanyProfile.service";

const profile = { id: "tenant-a", name: "Empresa A", document: null, address: null, phone: null, email: null, businessType: "clinic" };

describe("current company profile service", () => {
  it("reads only the company supplied by authenticated context", async () => {
    const find = vi.fn().mockResolvedValue(profile);
    await expect(getCurrentCompanyProfile("tenant-a", { find })).resolves.toEqual(profile);
    expect(find).toHaveBeenCalledWith("tenant-a");
  });

  it("updates only the company supplied by authenticated context", async () => {
    const update = vi.fn().mockResolvedValue(profile);
    const input = { name: "Empresa A", document: null, address: null, phone: null, email: null, businessType: "clinic" };
    await updateCurrentCompanyProfile("tenant-a", input, { update });
    expect(update).toHaveBeenCalledWith("tenant-a", input);
  });

  it("rejects an absent company boundary", async () => {
    await expect(getCurrentCompanyProfile(" ", { find: vi.fn() })).rejects.toThrow("missing_company_id");
  });
});
