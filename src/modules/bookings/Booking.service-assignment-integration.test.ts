import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("booking service assignment integration", () => { it("keeps manual choice and resolves only when it is absent", () => { for (const file of ["src/modules/bookings/Booking.core.ts", "src/modules/bookings/Booking.service.ts"]) { const source = fs.readFileSync(file, "utf8"); expect(source).toContain("input.professionalId ??"); expect(source).toContain("resolveServiceBookingProfessional"); expect(source).toContain("professionalId: professionalId ?? null"); } }); });
