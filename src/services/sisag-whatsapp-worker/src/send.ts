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
