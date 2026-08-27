import { describe, expect, it } from "vitest";
import { buildSidebarGroups, buildSidebarVisibility } from "./menuPermissions";

describe("admin operational navigation", () => {
  it("uses business language and removes legacy entries", () => {
    const items = buildSidebarVisibility("owner").filter((item) => item.visible);
    expect(items.map((item) => item.label)).toEqual([
      "Visão geral", "Agenda", "Agendamentos", "Clientes",
      "Profissionais", "Empresa", "Configurações",
    ]);
    expect(items.map((item) => item.href)).not.toContain("/admin/appointments");
    expect(items.map((item) => item.label)).not.toContain("Visitas");
  });

  it("preserves role visibility", () => {
    const staff = buildSidebarVisibility("staff").filter((item) => item.visible);
    expect(staff.map((item) => item.label)).toEqual([
      "Visão geral", "Agenda", "Agendamentos", "Clientes",
    ]);
  });

  it("groups visible navigation without empty sections", () => {
    expect(buildSidebarGroups("admin").map((group) => group.label)).toEqual([
      "Principal", "Operação", "Estrutura", "Administração",
    ]);
  });

  it("prepares Spanish labels without changing routes", () => {
    const items = buildSidebarVisibility("owner", "es").filter((item) => item.visible);
    expect(items.map((item) => item.label)).toContain("Citas");
    expect(items.find((item) => item.key === "appointments")?.href).toBe("/admin/bookings");
  });
});
