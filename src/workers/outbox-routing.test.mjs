import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildOutboxWebhookHeaders,
  getOutboxWebhookConfig,
  selectOutboxDestination,
} from "./outbox-routing.mjs";

describe("outbox webhook routing", () => {
  it("uses the generic webhook for existing event types", () => {
    const config = getOutboxWebhookConfig({
      N8N_WEBHOOK_URL: "https://n8n.example/webhook/generic",
      N8N_WEBHOOK_SECRET: "generic-secret",
    });

    assert.deepEqual(selectOutboxDestination("booking.created", config), {
      channel: "generic",
      url: "https://n8n.example/webhook/generic",
      secret: "generic-secret",
    });
  });

  it("uses a dedicated webhook for onboarding execution", () => {
    const config = getOutboxWebhookConfig({
      N8N_WEBHOOK_URL: "https://n8n.example/webhook/generic",
      N8N_COMMERCIAL_ONBOARDING_WEBHOOK_URL:
        "https://n8n.example/webhook/commercial-onboarding",
      N8N_COMMERCIAL_ONBOARDING_WEBHOOK_SECRET: "commercial-secret",
    });

    assert.deepEqual(
      selectOutboxDestination(
        "commercial.onboarding.execution_requested",
        config,
      ),
      {
        channel: "commercial_onboarding",
        url: "https://n8n.example/webhook/commercial-onboarding",
        secret: "commercial-secret",
      },
    );
  });

  it("acknowledges onboarding step audit events without an external delivery", () => {
    const config = getOutboxWebhookConfig({
      N8N_WEBHOOK_URL: "https://n8n.example/webhook/generic",
      N8N_COMMERCIAL_ONBOARDING_WEBHOOK_URL:
        "https://n8n.example/webhook/commercial-onboarding",
    });

    assert.deepEqual(
      selectOutboxDestination("commercial.onboarding.step_changed", config),
      {
        channel: "commercial_onboarding_audit",
        url: null,
        secret: null,
        deliveryRequired: false,
      },
    );
  });

  it("acknowledges onboarding result audit events without an external delivery", () => {
    const config = getOutboxWebhookConfig({
      N8N_WEBHOOK_URL: "https://n8n.example/webhook/generic",
    });

    assert.equal(
      selectOutboxDestination(
        "commercial.onboarding.execution_result_received",
        config,
      ).deliveryRequired,
      false,
    );
  });

  it("keeps unrelated commercial events on the generic channel", () => {
    const config = getOutboxWebhookConfig({
      N8N_WEBHOOK_URL: "https://n8n.example/webhook/generic",
    });

    assert.equal(
      selectOutboxDestination("commercial.subscription.status_changed", config)
        .channel,
      "generic",
    );
  });

  it("acknowledges the scheduled post-activation plan without external delivery", () => {
    const config = getOutboxWebhookConfig({
      N8N_WEBHOOK_URL: "https://n8n.example/webhook/generic",
    });

    assert.deepEqual(
      selectOutboxDestination(
        "commercial.post_activation.follow_up_scheduled",
        config,
      ),
      {
        channel: "commercial_post_activation_audit",
        url: null,
        secret: null,
        deliveryRequired: false,
      },
    );
  });

  it("keeps unknown post-activation events on the generic channel", () => {
    const config = getOutboxWebhookConfig({
      N8N_WEBHOOK_URL: "https://n8n.example/webhook/generic",
    });

    assert.equal(
      selectOutboxDestination("commercial.post_activation.milestone_due", config)
        .channel,
      "generic",
    );
  });

  it("falls back to the generic webhook until the dedicated URL exists", () => {
    const config = getOutboxWebhookConfig({
      N8N_TARGET_URL: "https://n8n.example/webhook/generic",
      OUTBOX_WEBHOOK_SECRET: "legacy-secret",
    });

    assert.equal(
      selectOutboxDestination(
        "commercial.onboarding.execution_requested",
        config,
      ).channel,
      "generic",
    );
  });

  it("allows the dedicated webhook to reuse the generic secret", () => {
    const config = getOutboxWebhookConfig({
      N8N_WEBHOOK_SECRET: "generic-secret",
      N8N_COMMERCIAL_ONBOARDING_WEBHOOK_URL:
        "https://n8n.example/webhook/commercial-onboarding",
    });

    assert.equal(config.commercialOnboarding.secret, "generic-secret");
  });

  it("uses the legacy secret header for the generic webhook", () => {
    assert.deepEqual(
      buildOutboxWebhookHeaders({
        channel: "generic",
        secret: "generic-secret",
      }),
      { "x-webhook-secret": "generic-secret" },
    );
  });

  it("uses bearer authorization for commercial onboarding", () => {
    assert.deepEqual(
      buildOutboxWebhookHeaders({
        channel: "commercial_onboarding",
        secret: "commercial-secret",
      }),
      { authorization: "Bearer commercial-secret" },
    );
  });

  it("omits authentication when the destination has no secret", () => {
    assert.deepEqual(
      buildOutboxWebhookHeaders({ channel: "generic", secret: null }),
      {},
    );
  });

  it("loads webhook secrets from Docker secret files", () => {
    const secretFiles = new Map([
      ["/run/secrets/generic", "generic-file-secret"],
      ["/run/secrets/commercial", "commercial-file-secret"],
    ]);
    const config = getOutboxWebhookConfig(
      {
        N8N_WEBHOOK_SECRET_FILE: "/run/secrets/generic",
        N8N_WEBHOOK_SECRET: "generic-environment-secret",
        N8N_COMMERCIAL_ONBOARDING_WEBHOOK_SECRET_FILE:
          "/run/secrets/commercial",
        N8N_COMMERCIAL_ONBOARDING_WEBHOOK_SECRET:
          "commercial-environment-secret",
      },
      (file) => secretFiles.get(file) ?? null,
    );

    assert.equal(config.generic.secret, "generic-file-secret");
    assert.equal(
      config.commercialOnboarding.secret,
      "commercial-file-secret",
    );
  });

  it("allows the dedicated webhook to reuse the generic file secret", () => {
    const config = getOutboxWebhookConfig(
      {
        N8N_WEBHOOK_SECRET_FILE: "/run/secrets/generic",
        N8N_COMMERCIAL_ONBOARDING_WEBHOOK_URL:
          "https://n8n.example/webhook/commercial-onboarding",
      },
      () => "generic-file-secret",
    );

    assert.equal(config.commercialOnboarding.secret, "generic-file-secret");
  });

  it("normalizes empty configuration values", () => {
    const config = getOutboxWebhookConfig({
      N8N_WEBHOOK_URL: "  ",
      N8N_WEBHOOK_SECRET: "",
    });

    assert.deepEqual(config.generic, { url: null, secret: null });
  });
});
