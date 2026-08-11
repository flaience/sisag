import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const workflowPath = path.resolve(
  process.cwd(),
  "automation/n8n/workflows/commercial-onboarding-runtime.json",
);
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));

describe("commercial onboarding n8n workflow", () => {
  it("exposes the dedicated production webhook", () => {
    const webhook = workflow.nodes.find(
      (node: { name: string }) => node.name === "Commercial Onboarding Webhook",
    );
    expect(webhook).toMatchObject({
      type: "n8n-nodes-base.webhook",
      parameters: {
        authentication: "headerAuth",
        httpMethod: "POST",
        path: "sisag/commercial-onboarding/runtime",
        responseMode: "responseNode",
      },
    });
  });

  it("calls only the internal SISAG runtime endpoint", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Execute SISAG Runtime",
    );
    expect(request.parameters.url).toContain(
      "/api/platform/capabilities/commercial/execute-onboarding-runtime",
    );
    expect(request.parameters.authentication).toBe("genericCredentialType");
    expect(request.parameters.url).toBe(
      "https://sisag.flaience.com/api/platform/capabilities/commercial/execute-onboarding-runtime",
    );
  });

  it("returns only the parsed runtime body", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Execute SISAG Runtime",
    );
    const response = request.parameters.options.response.response;
    expect(response.fullResponse).toBeUndefined();
    expect(response.responseFormat).toBe("json");
  });

  it("contains no literal credential value", () => {
    const serialized = JSON.stringify(workflow);
    expect(serialized).not.toMatch(/ci-placeholder|internal-secret|webhook-secret/i);
    expect(serialized).toContain("REPLACE_WITH_ONBOARDING_WEBHOOK_CREDENTIAL_ID");
    expect(serialized).toContain("REPLACE_WITH_SISAG_INTERNAL_CREDENTIAL_ID");
  });

  it("validates the event before invoking SISAG", () => {
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Runtime Event",
    );
    expect(validator.parameters.jsCode).toContain(
      "commercial.onboarding.execution_requested",
    );
    expect(validator.parameters.jsCode).toContain("command?.key");
  });

  it("turns retryable failures into workflow errors", () => {
    const classifier = workflow.nodes.find(
      (node: { name: string }) => node.name === "Classify Runtime Result",
    );
    expect(classifier.parameters.jsCode).toContain("error?.retryable");
    expect(classifier.parameters.jsCode).toContain("$input.first().json");
    expect(classifier.parameters.jsCode).toContain("throw new Error");
  });

  it("normalizes streamed responses before returning them", () => {
    const classifier = workflow.nodes.find(
      (node: { name: string }) => node.name === "Classify Runtime Result",
    );
    expect(classifier.parameters.jsCode).toContain("_readableState?.buffer");
    expect(classifier.parameters.jsCode).toContain("String.fromCharCode");
    expect(classifier.parameters.jsCode).toContain("JSON.parse");
  });

  it("connects every orchestration node in order", () => {
    expect(Object.keys(workflow.connections)).toEqual([
      "Commercial Onboarding Webhook",
      "Validate Runtime Event",
      "Execute SISAG Runtime",
      "Classify Runtime Result",
    ]);
    expect(workflow.active).toBe(false);
  });
});
