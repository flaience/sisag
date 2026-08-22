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

  it("acquires a bounded lease before running due milestones", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Acquire Runner Lease",
    );
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Runner Lease Acquisition",
    );
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/manage-post-activation-runner-lease",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
    });
    expect(request.parameters.body).toContain('action: "acquire"');
    expect(request.parameters.body).toContain("ownerKey: String($execution.id)");
    expect(request.parameters.body).toContain("ttlSeconds: 1800");
    expect(validator.parameters.jsCode).toContain("response.data.acquired !== true");
    expect(validator.parameters.jsCode).toContain("return []");
    expect(validator.parameters.jsCode).toContain("startedAt: new Date().toISOString()");
  });

  it("releases only the lease owned by the current execution", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Release Runner Lease",
    );
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Runner Lease Release",
    );
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/manage-post-activation-runner-lease",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
    });
    expect(request.parameters.body).toContain('action: "release"');
    expect(request.parameters.body).toContain("ownerKey: String($execution.id)");
    expect(validator.parameters.jsCode).toContain("response?.data?.released !== true");
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

  it("persists metrics through the protected internal endpoint", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Persist Runner Metrics",
    );
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/persist-post-activation-runner-metrics",
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

  it("identifies each durable metrics write with the n8n execution", () => {
    const prepare = workflow.nodes.find(
      (node: { name: string }) => node.name === "Prepare Runner Metrics",
    );
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Runner Metrics Persistence",
    );
    expect(prepare.parameters.jsCode).toContain(
      'runnerKey: "post_activation_due_runner"',
    );
    expect(prepare.parameters.jsCode).toContain(
      "executionKey: String($execution.id)",
    );
    expect(prepare.parameters.jsCode).not.toContain("$getWorkflowStaticData");
    expect(validator.parameters.jsCode).not.toContain("$getWorkflowStaticData");
    expect(validator.parameters.jsCode).toContain("response?.data?.metrics");
    expect(validator.parameters.jsCode).toContain(
      "post_activation_runner_metrics_invalid_json_response",
    );
    expect(validator.parameters.jsCode).toContain(
      "post_activation_runner_metrics_persistence_failed",
    );
  });

  it("synchronizes durable alert occurrences through the protected endpoint", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Synchronize Alert Occurrences",
    );
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Alert Occurrence Synchronization",
    );
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/synchronize-post-activation-alert-occurrences",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
    });
    expect(request.parameters.options.response.response).toMatchObject({
      neverError: true,
      responseFormat: "json",
    });
    expect(validator.parameters.jsCode).toContain("_readableState?.buffer");
    expect(validator.parameters.jsCode).toContain(
      "post_activation_alert_occurrence_sync_invalid_json_response",
    );
    expect(validator.parameters.jsCode).toContain(
      "post_activation_alert_occurrence_sync_failed",
    );
  });

  it("queries and validates actionable SLA signals through the protected endpoint", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Query Alert SLA Signals",
    );
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Alert SLA Signals",
    );
    expect(request.parameters).toMatchObject({
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/get-post-activation-alert-sla-signals?limit=100",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
    });
    expect(request.parameters.options.response.response).toMatchObject({
      neverError: true,
      responseFormat: "json",
    });
    expect(validator.parameters.jsCode).toContain("_readableState?.buffer");
    expect(validator.parameters.jsCode).toContain("post_activation_alert_sla_signals_invalid_json_response");
    expect(validator.parameters.jsCode).toContain("post_activation_alert_sla_signals_query_failed");
    expect(validator.parameters.jsCode).toContain("post_activation_alert_sla_signals_truncated");
    expect(validator.parameters.jsCode).toContain("signals: response.data.signals");
  });

  it("synchronizes durable SLA signal occurrences through the protected endpoint", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Synchronize Alert SLA Signal Occurrences",
    );
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Alert SLA Signal Occurrence Synchronization",
    );
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/synchronize-post-activation-alert-sla-signal-occurrences",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      body: "={{ JSON.stringify({ signals: $json.signals }) }}",
    });
    expect(request.parameters.options.response.response).toMatchObject({
      neverError: true,
      responseFormat: "json",
    });
    expect(validator.parameters.jsCode).toContain("post_activation_alert_sla_signal_occurrence_sync_invalid_json_response");
    expect(validator.parameters.jsCode).toContain("post_activation_alert_sla_signal_occurrence_sync_failed");
  });

  it("persists capacity before releasing the runner lease", () => {
    const prepare = workflow.nodes.find(
      (node: { name: string }) => node.name === "Prepare Runner Capacity",
    );
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Persist Runner Capacity",
    );
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Runner Capacity Persistence",
    );
    expect(prepare.parameters.jsCode).toContain('$("Validate Runner Lease Acquisition")');
    expect(prepare.parameters.jsCode).toContain('$("Validate Runner Summary")');
    expect(prepare.parameters.jsCode).toContain("executionKey: String($execution.id)");
    expect(prepare.parameters.jsCode).toContain("batchLimit: 25");
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/persist-post-activation-runner-capacity",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      body: "={{ JSON.stringify($json) }}",
    });
    expect(request.parameters.options.response.response).toMatchObject({
      neverError: true,
      responseFormat: "json",
    });
    expect(validator.parameters.jsCode).toContain("post_activation_runner_capacity_invalid_json_response");
    expect(validator.parameters.jsCode).toContain("post_activation_runner_capacity_persistence_failed");
  });

  it("connects the complete durable pipeline in order", () => {
    expect(Object.keys(workflow.connections)).toEqual([
      "Every 15 Minutes",
      "Acquire Runner Lease",
      "Validate Runner Lease Acquisition",
      "Run Due Milestones",
      "Validate Runner Summary",
      "Prepare Runner Metrics",
      "Persist Runner Metrics",
      "Validate Runner Metrics Persistence",
      "Synchronize Alert Occurrences",
      "Validate Alert Occurrence Synchronization",
      "Query Alert SLA Signals",
      "Validate Alert SLA Signals",
      "Synchronize Alert SLA Signal Occurrences",
      "Validate Alert SLA Signal Occurrence Synchronization",
      "Prepare Runner Capacity",
      "Persist Runner Capacity",
      "Validate Runner Capacity Persistence",
      "Release Runner Lease",
    ]);
    expect(workflow.connections["Every 15 Minutes"].main[0][0].node)
      .toBe("Acquire Runner Lease");
    expect(workflow.connections["Acquire Runner Lease"].main[0][0].node)
      .toBe("Validate Runner Lease Acquisition");
    expect(workflow.connections["Validate Runner Lease Acquisition"].main[0][0].node)
      .toBe("Run Due Milestones");
    expect(workflow.connections["Run Due Milestones"].main[0][0].node)
      .toBe("Validate Runner Summary");
    expect(workflow.connections["Validate Runner Summary"].main[0][0].node)
      .toBe("Prepare Runner Metrics");
    expect(workflow.connections["Prepare Runner Metrics"].main[0][0].node)
      .toBe("Persist Runner Metrics");
    expect(workflow.connections["Persist Runner Metrics"].main[0][0].node)
      .toBe("Validate Runner Metrics Persistence");
    expect(workflow.connections["Validate Runner Metrics Persistence"].main[0][0].node)
      .toBe("Synchronize Alert Occurrences");
    expect(workflow.connections["Synchronize Alert Occurrences"].main[0][0].node)
      .toBe("Validate Alert Occurrence Synchronization");
    expect(workflow.connections["Validate Alert Occurrence Synchronization"].main[0][0].node)
      .toBe("Query Alert SLA Signals");
    expect(workflow.connections["Query Alert SLA Signals"].main[0][0].node)
      .toBe("Validate Alert SLA Signals");
    expect(workflow.connections["Validate Alert SLA Signals"].main[0][0].node)
      .toBe("Synchronize Alert SLA Signal Occurrences");
    expect(workflow.connections["Synchronize Alert SLA Signal Occurrences"].main[0][0].node)
      .toBe("Validate Alert SLA Signal Occurrence Synchronization");
    expect(workflow.connections["Validate Alert SLA Signal Occurrence Synchronization"].main[0][0].node)
      .toBe("Prepare Runner Capacity");
    expect(workflow.connections["Prepare Runner Capacity"].main[0][0].node)
      .toBe("Persist Runner Capacity");
    expect(workflow.connections["Persist Runner Capacity"].main[0][0].node)
      .toBe("Validate Runner Capacity Persistence");
    expect(workflow.connections["Validate Runner Capacity Persistence"].main[0][0].node)
      .toBe("Release Runner Lease");
    expect(workflow.connections["Release Runner Lease"].main[0][0].node)
      .toBe("Validate Runner Lease Release");
  });

  it("ships inactive with the production timezone", () => {
    expect(workflow.active).toBe(false);
    expect(workflow.settings.timezone).toBe("America/Sao_Paulo");
    expect(workflow.settings.saveDataErrorExecution).toBe("all");
    expect(workflow.settings.saveDataSuccessExecution).toBe("none");
  });
});
