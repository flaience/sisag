import { describe, expect, it } from "vitest";
import { buildSidebarGroups, buildSidebarVisibility } from "./menuPermissions";

describe("admin operational navigation", () => {
  it("uses business language and removes legacy entries", () => {
    const items = buildSidebarVisibility("owner").filter((item) => item.visible);
    expect(items.map((item) => item.label)).toEqual([
      "Visão geral", "Agenda", "Agendamentos", "Clientes",
      "Profissionais", "Serviços", "Empresa", "Locais de atendimento", "Configurações",
    ]);
    expect(items.map((item) => item.href)).not.toContain("/admin/appointments");
    expect(items.find((item) => item.key === "company")?.href).toBe("/admin/settings/company");
    expect(items.find((item) => item.key === "units")?.href).toBe("/admin/settings/units");
    expect(items.map((item) => item.label)).not.toContain("Visitas");
  });

  it("preserves role visibility", () => {
    const staff = buildSidebarVisibility("staff").filter((item) => item.visible);
    expect(buildSidebarVisibility("admin").find((item) => item.key === "company")?.visible).toBe(true);
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
