import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CompanyUnitCards, formatCompanyUnitAddress, type CompanyUnitView } from "./CompanyUnitCards";
const unit: CompanyUnitView = { id: "1", code: "centro", name: "Unidade Centro", timeZone: "America/Sao_Paulo", phone: null, email: null, postalCode: "01000-000", street: "Rua Central", number: "10", complement: null, district: "Centro", city: "São Paulo", state: "SP", countryCode: "BR", isDefault: true, active: true };
describe("company unit cards", () => {
  it("presents operational labels without technical vocabulary", () => {
    const html = renderToStaticMarkup(<CompanyUnitCards items={[unit]} onEdit={vi.fn()} />);
    expect(html).toContain("Unidade Centro"); expect(html).toContain("Principal"); expect(html).toContain("Ativa");
    expect(html).not.toContain("companyId");
  });
  it("formats a readable address and supports the empty state", () => {
    expect(formatCompanyUnitAddress(unit)).toContain("Rua Central, 10");
    expect(renderToStaticMarkup(<CompanyUnitCards items={[]} onEdit={vi.fn()} />)).toContain("Nenhuma unidade cadastrada");
  });
});
