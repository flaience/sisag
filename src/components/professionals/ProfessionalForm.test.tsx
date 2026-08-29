import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

import { ProfessionalForm } from "./ProfessionalForm";

describe("ProfessionalForm", () => {
  it("starts with a clear loading state", () => {
    const html = renderToStaticMarkup(<ProfessionalForm />);
    expect(html).toContain("Carregando profissional");
  });
});
