import { describe, expect, it } from "vitest";
import { normalizeYesNo } from "./AssistantWhatsApp.service";

describe("WhatsApp confirmation normalization", () => {
  it.each(["não", "Não.", "NÃO!", "*NÃO*", "não, obrigado", "Não, obrigada.", "desistir", "quero desistir"])("recognizes explicit negative reply: %s", text => {
    expect(normalizeYesNo(text)).toBe("NO");
  });

  it.each(["sim", "Sim.", "SIM!", "*SIM*", "Sí.", "SÍ!", "*Sí*", "Sín", "Sín.", "sim, por favor", "Pode confirmar.", "confirmo"])("recognizes explicit positive reply: %s", text => {
    expect(normalizeYesNo(text)).toBe("YES");
  });

  it.each(["não sei", "sim ou não", "talvez", "pode ser outro horário", ""]) ("rejects ambiguous reply: %s", text => {
    expect(normalizeYesNo(text)).toBe("OTHER");
  });
});
