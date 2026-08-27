import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SisagDataState } from "../feedback/SisagDataState";
import { SisagListFrame } from "./SisagListFrame";
import { SisagPageHeader } from "./SisagPageHeader";

describe("SISAG admin page patterns", () => {
  it("renders page context, purpose and primary actions", () => {
    const html = renderToStaticMarkup(
      <SisagPageHeader
        context="Unidade Centro"
        title="Clientes"
        description="Consulte e mantenha os clientes da empresa."
        actions={<button>Novo cliente</button>}
      />,
    );
    expect(html).toContain("Unidade Centro");
    expect(html).toContain("Clientes");
    expect(html).toContain("Novo cliente");
  });

  it("keeps filters, content and pagination in one list frame", () => {
    const html = renderToStaticMarkup(
      <SisagListFrame title="Clientes cadastrados" toolbar={<input aria-label="Buscar" />} footer="Página 1">
        <table><tbody><tr><td>Maria</td></tr></tbody></table>
      </SisagListFrame>,
    );
    expect(html).toContain("Clientes cadastrados");
    expect(html).toContain('aria-label="Buscar"');
    expect(html).toContain("Maria");
    expect(html).toContain("Página 1");
  });

  it.each([
    ["loading", "Carregando informações", 'role="status"'],
    ["empty", "Nenhum registro encontrado", 'role="status"'],
    ["error", "Não foi possível carregar", 'role="alert"'],
  ] as const)("renders the %s state accessibly", (state, message, role) => {
    const html = renderToStaticMarkup(<SisagDataState state={state} />);
    expect(html).toContain(message);
    expect(html).toContain(role);
    expect(html).toContain('aria-live="polite"');
  });
});
