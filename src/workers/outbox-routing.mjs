const COMMERCIAL_EXECUTION_EVENT =
  "commercial.onboarding.execution_requested";
const COMMERCIAL_ONBOARDING_PREFIX = "commercial.onboarding.";

function clean(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function getOutboxWebhookConfig(
  environment = process.env,
  readSecretFile = () => null,
) {
  const genericUrl = clean(
    environment.N8N_WEBHOOK_URL ?? environment.N8N_TARGET_URL,
  );
  const genericSecret = clean(
    readSecretFile(environment.N8N_WEBHOOK_SECRET_FILE) ??
      readSecretFile(environment.OUTBOX_WEBHOOK_SECRET_FILE) ??
      environment.N8N_WEBHOOK_SECRET ??
      environment.OUTBOX_WEBHOOK_SECRET,
  );
  const commercialUrl = clean(
    environment.N8N_COMMERCIAL_ONBOARDING_WEBHOOK_URL,
  );
  const commercialSecret = clean(
    readSecretFile(
      environment.N8N_COMMERCIAL_ONBOARDING_WEBHOOK_SECRET_FILE,
    ) ?? environment.N8N_COMMERCIAL_ONBOARDING_WEBHOOK_SECRET,
  );

  return {
    generic: { url: genericUrl, secret: genericSecret },
    commercialOnboarding: {
      url: commercialUrl,
      secret: commercialSecret ?? genericSecret,
    },
  };
}

export function selectOutboxDestination(
  eventType,
  config = getOutboxWebhookConfig(),
) {
  if (
    eventType === COMMERCIAL_EXECUTION_EVENT &&
    config.commercialOnboarding.url
  ) {
    return {
      channel: "commercial_onboarding",
      ...config.commercialOnboarding,
    };
  }

  if (
    eventType !== COMMERCIAL_EXECUTION_EVENT &&
    eventType.startsWith(COMMERCIAL_ONBOARDING_PREFIX)
  ) {
    return {
      channel: "commercial_onboarding_audit",
      url: null,
      secret: null,
      deliveryRequired: false,
    };
  }

  return { channel: "generic", ...config.generic };
}

export function buildOutboxWebhookHeaders(destination) {
  if (!destination?.secret) {
    return {};
  }

  if (destination.channel === "commercial_onboarding") {
    return {
      authorization: `Bearer ${destination.secret}`,
    };
  }

  return { "x-webhook-secret": destination.secret };
}
