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
    expect(validator.parameters.jsCode).toContain("const acquired = response.data.acquired === true");
    expect(validator.parameters.jsCode).not.toContain("return []");
    expect(validator.parameters.jsCode).toContain("startedAt: acquired ? new Date().toISOString() : null");
  });

  it("reports lease contention without entering the durable pipeline", () => {
    const decision = workflow.nodes.find(
      (node: { name: string }) => node.name === "Runner Lease Acquired",
    );
    const report = workflow.nodes.find(
      (node: { name: string }) => node.name === "Report Runner Lease Contention",
    );
    expect(decision).toMatchObject({
      type: "n8n-nodes-base.if",
      parameters: {
        conditions: {
          conditions: [expect.objectContaining({
            leftValue: "={{ $json.acquired }}",
            operator: expect.objectContaining({ type: "boolean", operation: "true" }),
          })],
        },
      },
    });
    expect(report.parameters.jsCode).toContain("skipped: true");
    expect(report.parameters.jsCode).toContain('reason: "lease_busy"');
    expect(report.parameters.jsCode).not.toContain("ownerKey");
  });

  it("recovers expired due work after acquiring the runner lease", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Recover Expired Due Work",
    );
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Due Work Recovery",
    );
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/recover-post-activation-due-work",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      body: "={{ JSON.stringify({ limit: 25 }) }}",
    });
    expect(request.parameters.options).toMatchObject({
      response: {
        response: {
          neverError: true,
          responseFormat: "json",
        },
      },
      timeout: 60000,
    });
    expect(validator.parameters.jsCode).toContain("post_activation_due_work_recovery_invalid_json_response");
    expect(validator.parameters.jsCode).toContain("post_activation_due_work_recovery_failed");
    expect(validator.parameters.jsCode).toContain("post_activation_due_work_recovery_summary_invalid");
    expect(validator.parameters.jsCode).toContain("retryable + exhausted !== recovered");
    expect(validator.parameters.jsCode).toContain("recovered !== items.length");
  });

  it("projects due work as the indexed source", () => {
    const request = workflow.nodes.find((node: { name: string }) => node.name === "Project Due Work");
    const validator = workflow.nodes.find((node: { name: string }) => node.name === "Validate Due Work Projection");
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/project-post-activation-due-work",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      body: "={{ JSON.stringify({ limit: 25 }) }}",
    });
    expect(validator.parameters.jsCode).toContain("post_activation_due_work_projection_failed");
    expect(validator.parameters.jsCode).toContain("data.synchronized + data.failed !== data.scanned");
    expect(workflow.nodes.some((node: { name: string }) => node.name === "Project Due Work Shadow")).toBe(false);
  });

  it("processes due work through one bounded batch request", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Process Due Work Batch",
    );
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Due Work Batch",
    );
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/process-post-activation-due-work-batch",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
    });
    expect(request.parameters.body).toContain('"post_activation_due_runner:" + String($execution.id)');
    expect(request.parameters.body).toContain("limit: 25");
    expect(request.parameters.body).toContain("concurrency: 5");
    expect(request.parameters.body).toContain("lockSeconds: 300");
    expect(request.parameters.body).toContain("deferSeconds: 900");
    expect(request.parameters.options).toMatchObject({
      response: { response: { neverError: true, responseFormat: "json" } },
      timeout: 300000,
    });
    expect(validator.parameters.jsCode).toContain("post_activation_due_work_batch_invalid_json_response");
    expect(validator.parameters.jsCode).toContain("post_activation_due_work_batch_failed");
    expect(validator.parameters.jsCode).toContain("post_activation_due_work_batch_summary_invalid");
    expect(validator.parameters.jsCode).toContain("completed + deferred + escalated + failed + settlementFailed !== claimed");
    expect(validator.parameters.jsCode).toContain("claimed, completed, deferred, escalated, failed");
    expect(validator.parameters.jsCode).toContain('settlementFailed > 0 ? "degraded" : "healthy"');
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
    expect(validator.parameters.jsCode).toContain('$("Validate Runner Summary")');
    expect(validator.parameters.jsCode).toContain('$("Validate Due Work Recovery")');
    expect(validator.parameters.jsCode).toContain('$("Validate Due Work Batch")');
    expect(validator.parameters.jsCode).not.toContain("Compare Due Work Projection");
    expect(validator.parameters.jsCode)
      .toContain("capacity, fairness, dueWork, recovery, processing");
  });

  it("composes the runner summary through the indexed contract", () => {
    const request = workflow.nodes.find((node: { name: string }) => node.name === "Compose Indexed Runner Summary");
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/compose-post-activation-indexed-runner-summary",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
    });
    expect(request.parameters.body).toContain('$("Validate Due Work Projection")');
    expect(request.parameters.body).toContain('$("Validate Due Work Batch")');
    expect(request.parameters.body).toContain('$("Validate Due Work Recovery")');
    expect(workflow.nodes.some((node: { name: string }) => node.name === "Run Due Milestones")).toBe(false);
  });

  it("uses JSON responses without returning connection internals", () => {
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Compose Indexed Runner Summary",
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
    expect(validator.parameters.jsCode).toContain("post_activation_indexed_runner_summary_invalid");
    expect(validator.parameters.jsCode).toContain("Number.isInteger(data[key])");
    expect(validator.parameters.jsCode).toContain("Array.isArray(data.failures)");
    expect(validator.parameters.jsCode).toContain("data.source");
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
      "post_activation_indexed_runner_summary_invalid_json_response",
    );
  });

  it("keeps a compact successful execution summary", () => {
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Runner Summary",
    );
    expect(validator.parameters.jsCode).toContain("data.source");
    expect(validator.parameters.jsCode).toContain("data.wrapped");
    expect(validator.parameters.jsCode).toContain("const counters =");
    expect(validator.parameters.jsCode).toContain("return [{ json: data }]");
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

  it("persists fairness before releasing the runner lease", () => {
    const prepare = workflow.nodes.find(
      (node: { name: string }) => node.name === "Prepare Runner Fairness",
    );
    const request = workflow.nodes.find(
      (node: { name: string }) => node.name === "Persist Runner Fairness",
    );
    const validator = workflow.nodes.find(
      (node: { name: string }) => node.name === "Validate Runner Fairness Persistence",
    );
    expect(prepare.parameters.jsCode).toContain('$("Validate Runner Summary")');
    expect(prepare.parameters.jsCode).toContain("cursor: summary.cursor ?? null");
    expect(prepare.parameters.jsCode).toContain("wrapped: summary.wrapped");
    expect(prepare.parameters.jsCode).toContain("batchLimit: 25");
    expect(request.parameters).toMatchObject({
      method: "POST",
      url: "https://sisag.flaience.com/api/platform/capabilities/commercial/persist-post-activation-runner-fairness",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      body: "={{ JSON.stringify($json) }}",
    });
    expect(request.parameters.options.response.response).toMatchObject({
      neverError: true,
      responseFormat: "json",
    });
    expect(validator.parameters.jsCode).toContain("post_activation_runner_fairness_invalid_json_response");
    expect(validator.parameters.jsCode).toContain("post_activation_runner_fairness_persistence_failed");
  });

  it("connects the indexed durable pipeline without the legacy executor", () => {
    const names = Object.keys(workflow.connections);
    expect(names).toContain("Project Due Work");
    expect(names).toContain("Compose Indexed Runner Summary");
    expect(names).not.toContain("Run Due Milestones");
    expect(names).not.toContain("Compare Due Work Projection");
    expect(workflow.connections["Validate Due Work Recovery"].main[0][0].node).toBe("Project Due Work");
    expect(workflow.connections["Project Due Work"].main[0][0].node).toBe("Validate Due Work Projection");
    expect(workflow.connections["Validate Due Work Projection"].main[0][0].node).toBe("Process Due Work Batch");
    expect(workflow.connections["Validate Due Work Batch"].main[0][0].node).toBe("Compose Indexed Runner Summary");
    expect(workflow.connections["Compose Indexed Runner Summary"].main[0][0].node).toBe("Validate Runner Summary");
    expect(workflow.connections["Validate Runner Summary"].main[0][0].node).toBe("Prepare Runner Metrics");
  });

  it("ships inactive with the production timezone", () => {
    expect(workflow.active).toBe(false);
    expect(workflow.settings.timezone).toBe("America/Sao_Paulo");
    expect(workflow.settings.saveDataErrorExecution).toBe("all");
    expect(workflow.settings.saveDataSuccessExecution).toBe("none");
  });
});
