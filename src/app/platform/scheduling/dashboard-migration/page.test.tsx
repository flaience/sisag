import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ observe: vi.fn() }));
vi.mock("@/modules/dashboard/Dashboard.bookings-shadow-audit", () => ({ DashboardBookingsShadowAuditService: { observe: mocks.observe } }));
vi.mock("@/components/platform/DashboardBookingsShadowAuditPanel", () => ({ DashboardBookingsShadowAuditPanel: ({ companyId, data, error }: { companyId: string; data: unknown; error?: string | null }) => <div>panel:{companyId};data:{data ? "yes" : "no"};error:{error ?? "none"}</div> }));
import DashboardMigrationPage from "./page";

describe("DashboardMigrationPage", () => {
  beforeEach(() => vi.clearAllMocks());
  it("does not query without a company", async () => { const html = renderToStaticMarkup(await DashboardMigrationPage({ searchParams: Promise.resolve({}) })); expect(html).toContain("Migração da agenda"); expect(html).toContain("data:no"); expect(mocks.observe).not.toHaveBeenCalled(); });
  it("rejects malformed company input", async () => { const html = renderToStaticMarkup(await DashboardMigrationPage({ searchParams: Promise.resolve({ companyId: "invalid" }) })); expect(html).toContain("identificador de empresa válido"); expect(mocks.observe).not.toHaveBeenCalled(); });
  it("observes an authorized company selection", async () => { mocks.observe.mockResolvedValue({ matched: true }); const id = "23164020-8778-4226-afed-189e8d2333cc"; const html = renderToStaticMarkup(await DashboardMigrationPage({ searchParams: Promise.resolve({ companyId: id }) })); expect(mocks.observe).toHaveBeenCalledWith(id); expect(html).toContain("data:yes"); });
  it("keeps the page available on observation failure", async () => { vi.spyOn(console, "error").mockImplementation(() => undefined); mocks.observe.mockRejectedValue(new Error("private")); const html = renderToStaticMarkup(await DashboardMigrationPage({ searchParams: Promise.resolve({ companyId: "23164020-8778-4226-afed-189e8d2333cc" }) })); expect(html).toContain("Não foi possível comparar"); });
});
