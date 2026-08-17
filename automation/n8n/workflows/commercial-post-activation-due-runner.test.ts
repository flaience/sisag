import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const workflowPath = path.resolve(
  process.cwd(),
  "automation/n8n/workflows/commercial-post-activation-due-runner.json",
);
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));

describe("commercial post-activation due runner n8n workflow", () => {
  it("runs every 15 minutes", () => {
    const trigger = workflow.nodes.find(
      (node: { name: string }) => node.name === "Every 15 Minutes",
    );
    expect(trigger).toMatchObject({
      type: "n8n-nodes-base.scheduleTrigger",
      parameters: {
        rule: {
          interval: [{ field: "minutes", minutesInterval: 15 }],
        },
      },
    });
  });

  it("calls only the protected due runner endpoint", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Run Due Milestones",
    );
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/run-post-activation-due-milestones",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      body: "={{ JSON.stringify({ limit: 25 }) }}",
    });
  });

  it("uses JSON responses without returning connection internals", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Run Due Milestones",
    );
    const response = request.parameters.options.response.response;
    expect(response.responseFormat).toBe("json");
    expect(response.fullResponse).toBeUndefined();
  });

  it("contains no literal credential value", () => {
    const serialized = JSON.stringify(workflow);
    expect(serialized).not.toMatch(/ci-placeholder|internal-secret|x-platform-internal-secret/i);
    expect(serialized).toContain("REPLACE_WITH_SISAG_INTERNAL_CREDENTIAL_ID");
  });

  it("turns invalid runner responses into workflow errors", () => {
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Runner Summary",
    );
    expect(validator.parameters.jsCode).toContain("response?.ok !== true");
    expect(validator.parameters.jsCode).toContain("throw new Error");
    expect(validator.parameters.jsCode).not.toContain("response.data.failed > 0");
  });

  it("projects metrics through the protected internal endpoint", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Project Runner Metrics",
    );
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/project-post-activation-runner-metrics",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      body: "={{ JSON.stringify($json) }}",
    });
    expect(request.parameters.options.response.response).toMatchObject({
      neverError: true,
      responseFormat: "json",
    });
  });

  it("normalizes the streamed response used by n8n 2.26", () => {
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Runner Summary",
    );
    expect(validator.parameters.jsCode).toContain("_readableState?.buffer");
    expect(validator.parameters.jsCode).toContain("String.fromCharCode");
    expect(validator.parameters.jsCode).toContain("JSON.parse");
    expect(validator.parameters.jsCode).toContain(
      "post_activation_due_runner_invalid_json_response",
    );
  });

  it("keeps a compact successful execution summary", () => {
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Runner Summary",
    );
    expect(validator.parameters.jsCode).toContain("scanned: response.data.scanned");
    expect(validator.parameters.jsCode).toContain("processed: response.data.processed");
    expect(validator.parameters.jsCode).not.toContain("failures: response.data.failures");
  });

  it("reuses and persists workflow-global runner metrics", () => {
    const prepare = workflow.nodes.find(
      (node: { name: string }) => node.name === "Prepare Runner Metrics",
    );
    const persist = workflow.nodes.find(
      (node: { name: string }) => node.name === "Persist Runner Metrics",
    );
    expect(prepare.parameters.jsCode).toContain('$getWorkflowStaticData("global")');
    expect(prepare.parameters.jsCode).toContain("body.previous = state.runnerMetrics");
    expect(persist.parameters.jsCode).toContain('$getWorkflowStaticData("global")');
    expect(persist.parameters.jsCode).toContain("state.runnerMetrics = response.data");
    expect(persist.parameters.jsCode).toContain(
      "post_activation_runner_metrics_invalid_json_response",
    );
  });

  it("connects the complete metrics pipeline in order", () => {
    expect(Object.keys(workflow.connections)).toEqual([
      "Every 15 Minutes",
      "Run Due Milestones",
      "Validate Runner Summary",
      "Prepare Runner Metrics",
      "Project Runner Metrics",
    ]);
    expect(workflow.connections["Every 15 Minutes"].main[0][0].node)
      .toBe("Run Due Milestones");
    expect(workflow.connections["Run Due Milestones"].main[0][0].node)
      .toBe("Validate Runner Summary");
    expect(workflow.connections["Validate Runner Summary"].main[0][0].node)
      .toBe("Prepare Runner Metrics");
    expect(workflow.connections["Prepare Runner Metrics"].main[0][0].node)
      .toBe("Project Runner Metrics");
    expect(workflow.connections["Project Runner Metrics"].main[0][0].node)
      .toBe("Persist Runner Metrics");
  });

  it("ships inactive with the production timezone", () => {
    expect(workflow.active).toBe(false);
    expect(workflow.settings.timezone).toBe("America/Sao_Paulo");
    expect(workflow.settings.saveDataErrorExecution).toBe("all");
    expect(workflow.settings.saveDataSuccessExecution).toBe("none");
  });
});
