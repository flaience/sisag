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

  it("normalizes empty configuration values", () => {
    const config = getOutboxWebhookConfig({
      N8N_WEBHOOK_URL: "  ",
      N8N_WEBHOOK_SECRET: "",
    });

    assert.deepEqual(config.generic, { url: null, secret: null });
  });
});
