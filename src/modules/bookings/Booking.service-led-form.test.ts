import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("service-led booking form", () => { it("offers automatic and manual modes", () => { const source = fs.readFileSync("src/app/admin/bookings/new/page.tsx", "utf8"); expect(source).toContain("Escolher pelo serviço"); expect(source).toContain("Escolher o profissional"); expect(source).toContain("setProfessionalId(selection.professionalId)"); expect(source).toContain("assignedProfessionalName"); }); });
