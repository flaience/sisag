import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminShell } from "./AdminShell";

describe("AdminShell", () => {
  it("renders grouped Portuguese operational navigation", () => {
    const html = renderToStaticMarkup(<AdminShell user={{ id: "1", name: "Ana", role: "owner" }}><div>Conteúdo</div></AdminShell>);
    expect(html).toContain("SISAG");
    expect(html).toContain("Visão geral");
    expect(html).toContain("Agendamentos");
    expect(html).toContain("Clientes");
    expect(html).toContain("Proprietário");
    expect(html).not.toContain(">owner<");
    expect(html).not.toContain("Appointments");
    expect(html).not.toContain("Visitas");
  });

  it("does not expose restricted structure to staff", () => {
    const html = renderToStaticMarkup(<AdminShell user={{ id: "2", name: "Bia", role: "staff" }}><div /></AdminShell>);
    expect(html).not.toContain("Profissionais");
    expect(html).not.toContain("Configurações");
  });

  it("renders prepared Spanish business labels", () => {
    const html = renderToStaticMarkup(<AdminShell locale="es" user={{ id: "3", name: "Eva", role: "owner" }}><div /></AdminShell>);
    expect(html).toContain("Citas");
    expect(html).toContain("Configuración");
    expect(html).toContain("Propietario");
    expect(html).not.toContain("Bookings");
  });
});
