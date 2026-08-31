import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("scheduling defaults presentation", () => { it("presents defaults as editable accelerators", () => { const config = fs.readFileSync("src/app/admin/settings/scheduling/page.tsx", "utf8"); expect(config).toContain("Padrões de agendamento"); expect(config).toContain("A equipe poderá alterá-las"); expect(config).toContain("defaultUnitId"); expect(config).toContain("defaultServiceId"); expect(config).toContain("defaultProfessionalId"); }); });
