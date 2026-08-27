import { describe, expect, it } from "vitest";
import { getAdminRoleLabel } from "./adminPresentation";

describe("admin presentation language boundary", () => {
  it("translates internal access roles to Portuguese", () => {
    expect(getAdminRoleLabel("owner")).toBe("Proprietário");
    expect(getAdminRoleLabel("admin")).toBe("Administrador");
    expect(getAdminRoleLabel("staff")).toBe("Equipe");
    expect(getAdminRoleLabel(null)).toBe("Sem perfil");
  });

  it("keeps the Spanish role vocabulary ready", () => {
    expect(getAdminRoleLabel("owner", "es")).toBe("Propietario");
    expect(getAdminRoleLabel("staff", "es")).toBe("Equipo");
    expect(getAdminRoleLabel(null, "es")).toBe("Sin perfil");
  });
});
