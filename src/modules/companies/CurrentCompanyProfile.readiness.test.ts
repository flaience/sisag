import { describe, expect, it } from "vitest";
import { getCurrentCompanyProfileReadiness } from "./CurrentCompanyProfile.readiness";

const base = { id: "company", name: "Empresa", document: null, address: null, phone: null, email: null, businessType: "generic" };

describe("current company profile readiness", () => {
  it("identifies missing operational data", () => {
    expect(getCurrentCompanyProfileReadiness(base)).toMatchObject({ completed: 2, total: 4, ready: false, percentage: 50 });
  });
  it("marks a complete company profile as ready", () => {
    expect(getCurrentCompanyProfileReadiness({ ...base, phone: "+5511999999999", address: "Rua Central, 10" }).ready).toBe(true);
  });
});
