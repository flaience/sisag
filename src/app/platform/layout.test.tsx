import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  requirePlatformOperator: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));
vi.mock("@/lib/auth/requirePlatformOperator", () => ({
  requirePlatformOperator: mocks.requirePlatformOperator,
}));

import PlatformLayout from "./layout";

describe("PlatformLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockResolvedValue({
      auth: { getSession: mocks.getSession },
    });
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "platform-access-token" } },
      error: null,
    });
    mocks.requirePlatformOperator.mockResolvedValue({
      userId: "operator-1",
      email: "operator@sisag.test",
      name: "Operador SISAG",
      role: "operator",
    });
  });

  it("authorizes the layout with the SSR access token", async () => {
    await PlatformLayout({ children: "protected-platform-content" });
    expect(mocks.requirePlatformOperator).toHaveBeenCalledWith("platform-access-token");
  });

  it("forwards an empty token when the session is absent", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await PlatformLayout({ children: "protected-platform-content" });
    expect(mocks.requirePlatformOperator).toHaveBeenCalledWith("");
  });

  it("renders the isolated platform shell", async () => {
    const component = await PlatformLayout({ children: <div>Conteúdo protegido</div> });
    const html = renderToStaticMarkup(component);
    expect(html).toContain("Ambiente interno Flaience");
    expect(html).toContain("Centro de Controle SISAG");
    expect(html).toContain("Operador SISAG");
    expect(html).toContain("Pós-ativação comercial");
    expect(html).toContain("Migração da agenda");
    expect(html).toContain("Conteúdo protegido");
  });

  it("does not swallow authorization failures", async () => {
    mocks.requirePlatformOperator.mockRejectedValue(new Error("redirect:/unauthorized"));
    await expect(PlatformLayout({ children: "protected-platform-content" }))
      .rejects.toThrow("redirect:/unauthorized");
  });
});
