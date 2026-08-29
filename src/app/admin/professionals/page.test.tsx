import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProfessionalsPage from "./page";
describe("ProfessionalsPage", () => { it("uses a clear operational loading state", () => { expect(renderToStaticMarkup(<ProfessionalsPage />)).toContain("Carregando profissionais"); }); });
