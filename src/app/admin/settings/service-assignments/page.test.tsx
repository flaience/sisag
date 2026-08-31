import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("service assignment management UI", () => { it("uses operational language and preserves reversible actions", () => { const page = fs.readFileSync("src/app/admin/settings/service-assignments/page.tsx", "utf8"); expect(page).toContain("Profissionais preferenciais por turno"); expect(page).toContain("Todos os serviços do turno"); expect(page).toContain('method: "DELETE"'); expect(page).not.toContain("serviceId: null"); }); });
