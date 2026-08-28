import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompanyLogoManager } from "./CompanyLogoManager";
describe("CompanyLogoManager", () => { it("explains the secure logo experience in business language", () => { const html = renderToStaticMarkup(<CompanyLogoManager />); expect(html).toContain("Identidade visual"); expect(html).toContain("Escolher imagem"); expect(html).toContain("máximo de 2 MB"); expect(html).not.toContain("bucket"); }); });
