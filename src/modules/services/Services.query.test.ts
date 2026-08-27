import { describe, expect, it, vi } from "vitest";
import { listServicesForCompany } from "./Services.query";

describe("services company query", () => {
  it("requires the authenticated company boundary", async () => {
    await expect(listServicesForCompany({ companyId: " " }, { query: vi.fn() })).rejects.toThrow("missing_company_id");
  });

  it("normalizes input without changing company ownership", async () => {
    const query = vi.fn().mockResolvedValue([{ id: "service-1", name: "Consulta", durationMinutes: 30 }]);
    await expect(listServicesForCompany({ companyId: "tenant-a", search: " consulta " }, { query })).resolves.toHaveLength(1);
    expect(query).toHaveBeenCalledWith({ companyId: "tenant-a", search: "consulta" });
  });
});
