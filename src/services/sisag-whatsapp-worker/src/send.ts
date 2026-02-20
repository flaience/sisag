import * as fs from "node:fs";
import { logInfo } from "./log.js";

function readSecret(path?: string) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return undefined;
  }
}

function getInternalSecret() {
  const fromFile = readSecret(process.env.SISAG_INTERNAL_SECRET_FILE);
  if (fromFile) return fromFile;
  if (process.env.SISAG_INTERNAL_SECRET)
    return process.env.SISAG_INTERNAL_SECRET;
  throw new Error("Missing SISAG_INTERNAL_SECRET(_FILE)");
}

function getCloudToken() {
  const fromFile = readSecret(process.env.WA_CLOUD_TOKEN_FILE);
  if (fromFile) return fromFile;
  if (process.env.WA_CLOUD_TOKEN) return process.env.WA_CLOUD_TOKEN;
  throw new Error("Missing WA_CLOUD_TOKEN(_FILE)");
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

/**
 * Normalização simples e segura (E.164 sem '+'):
 * - remove tudo que não for número
 * - se já começar com 55, mantém
 * - se vier sem 55, prefixa 55 (Brasil)
 *
 * Ajuste se você já tem normalização em outro ponto.
 */
function normalizeToE164Digits(toPhone: string) {
  const digits = (toPhone ?? "").replace(/\D/g, "");
  if (!digits) throw new Error("Invalid toPhone (empty after normalize)");
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export async function sendMock(payload: {
  companyId: string;
  toPhone: string;
  text: string;
}) {
  const baseUrl =
    process.env.SISAG_INTERNAL_BASE_URL ?? "http://app-frontend:3000";
  const url = `${baseUrl}/api/v1/integration/whatsapp/mock-send`;

  const secret = getInternalSecret();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-sisag-secret": secret,
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await res.text();
  let bodyJson: any = null;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {}

  logInfo("mock-send response", {
    status: res.status,
    body: bodyJson ?? bodyText,
  });

  if (!res.ok) {
    throw new Error(`mock-send failed: ${res.status} ${bodyText}`);
  }

  return bodyJson;
}

export async function sendCloud(payload: {
  companyId: string; // mantido por compatibilidade/log
  toPhone: string;
  text: string;
  // opcional: outboxId?: string; (se quiser logar/correlacionar)
}) {
  const apiBase = process.env.WA_API_BASE ?? "https://graph.facebook.com";
  const version = process.env.WA_GRAPH_VERSION ?? "v19.0";
  const phoneNumberId = requireEnv("WA_PHONE_NUMBER_ID");
  const token = getCloudToken();

  const to = normalizeToE164Digits(payload.toPhone);

  const url = `${apiBase}/${version}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: payload.text },
    }),
  });

  const bodyText = await res.text();
  let bodyJson: any = null;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {}

  logInfo("wa-cloud response", {
    status: res.status,
    to,
    body: bodyJson ?? bodyText,
  });

  if (!res.ok) {
    // Ajuda a classificar retry vs failed no worker:
    // você pode parsear status e decidir (401/403/400 = failed, 429/5xx = retrying)
    throw new Error(`wa-cloud failed: ${res.status} ${bodyText}`);
  }

  return bodyJson;
}

/**
 * Único ponto de envio usado pelo worker.
 * WHATSAPP_PROVIDER=mock|cloud (default: mock)
 */
export async function sendText(payload: {
  companyId: string;
  toPhone: string;
  text: string;
}) {
  const provider = (process.env.WHATSAPP_PROVIDER ?? "mock").toLowerCase();

  if (provider === "cloud") {
    return sendCloud(payload);
  }
  return sendMock(payload);
}
