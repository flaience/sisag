import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildN8nAgentShadowDecisionPrompt } from "./n8n/N8nAgentShadowDecision.service";

describe("n8n agent booking slot follow-up decision boundary", () => {
  it("distinguishes an offered slot from an existing appointment", () => {
    const prompt = buildN8nAgentShadowDecisionPrompt();
    expect(prompt).toContain("use scheduling.select_appointment somente para selecionar um agendamento existente");
    expect(prompt).toContain("resposta anterior do agente listar horários disponíveis");
    expect(prompt).toContain("preserve scheduling.find_available_slots");
  });

  it("uses the workflow marker already consumed by v14", () => {
    const context = readFileSync("src/modules/whatsapp/homologation/WhatsAppHomologationConversationContext.ts", "utf8");
    const workflow = readFileSync("automation/n8n/workflows/sisag-agent-shadow-v14.json", "utf8");
    expect(context).toContain("Escolha de horário do cliente");
    expect(workflow).toContain("escolha de horario do cliente:");
  });
});
