import fs from "node:fs";
import { describe, expect, it } from "vitest";

const manual = fs.readFileSync("docs/n8n-agent-operations-manual.md", "utf8");

describe("n8n agent current production operations manual boundary", () => {
  it("names the single production workflow and every mutation gate", () => {
    expect(manual).toContain("sisag-agent-shadow-v14.json");
    for (const flow of ["CONFIRMATION", "CANCELLATION", "RESCHEDULING"]) {
      expect(manual).toContain(`N8N_AGENT_BOOKING_${flow}_DECISION_ROUTING_ENABLED=true`);
      expect(manual).toContain(`N8N_AGENT_BOOKING_${flow}_EXECUTION_ENABLED=true`);
    }
  });

  it("keeps explicit confirmation and recovery rules", () => {
    expect(manual).toContain("**SIM**");
    expect(manual).toContain("**NÃO**");
    expect(manual).toContain("execution_uncertain");
    expect(manual).toContain("nunca crie outra chave");
  });
});

