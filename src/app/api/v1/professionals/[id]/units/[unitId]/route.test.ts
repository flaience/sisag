import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), deactivate: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.auth }));
vi.mock("@/modules/professionals/ProfessionalUnit.service", () => ({ ProfessionalUnitError: class extends Error {}, deactivateProfessionalUnit: mocks.deactivate }));
import { DELETE } from "./route";
const id = "11111111-1111-4111-8111-111111111111"; const unitId = "22222222-2222-4222-8222-222222222222";
describe("professional unit removal API", () => { it("deactivates inside the authenticated company", async () => { mocks.auth.mockResolvedValue({ ok: true, auth: { companyId: "company-a", role: "admin" } }); mocks.deactivate.mockResolvedValue({}); const response = await DELETE(new Request("https://sisag.test", { method: "DELETE" }) as never, { params: Promise.resolve({ id, unitId }) }); expect(response.status).toBe(200); expect(mocks.deactivate).toHaveBeenCalledWith("company-a", id, unitId); }); });
