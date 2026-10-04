import { describe, expect, it } from "vitest";
import { resolveProfessionalOptions } from "./WhatsAppStaffAgendaProfessionalResolver.service";

const rows = [
  { id: "ana-1", name: "Ana Silva" },
  { id: "joao-1", name: "João Souza" },
];

describe("WhatsApp staff agenda professional resolver", () => {
  it("resolves a unique first name accent-insensitively", () => {
    expect(resolveProfessionalOptions("joao", rows)).toEqual({ ok: true, professional: rows[1] });
  });

  it("resolves an exact full name", () => {
    expect(resolveProfessionalOptions("Ana Silva", rows)).toEqual({ ok: true, professional: rows[0] });
  });

  it("fails closed for a missing professional", () => {
    expect(resolveProfessionalOptions("Maria", rows)).toEqual({ ok: false, reason: "not_found" });
  });

  it("fails closed for an ambiguous name", () => {
    expect(resolveProfessionalOptions("Ana", [...rows, { id: "ana-2", name: "Ana Costa" }])).toEqual({ ok: false, reason: "ambiguous" });
  });
});
