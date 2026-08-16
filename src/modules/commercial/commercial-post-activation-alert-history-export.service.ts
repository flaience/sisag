import type { CommercialPostActivationAlertHistoryItem } from "./commercial-post-activation-alert-history.service";

const columns = [
  "cliente",
  "cliente_id",
  "onboarding_id",
  "alerta",
  "acao",
  "responsavel_tipo",
  "responsavel_id",
  "registrado_em",
  "observacao",
] as const;

function safeSpreadsheetValue(value: string) {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string) {
  const safe = safeSpreadsheetValue(value);
  return `"${safe.replaceAll('"', '""')}"`;
}

export function exportCommercialPostActivationAlertHistoryCsv(
  items: CommercialPostActivationAlertHistoryItem[],
) {
  const rows = items.map((item) => [
    item.clientName,
    item.commercialClientId,
    item.onboardingId,
    item.alertKey,
    item.action,
    item.actor.type,
    item.actor.id,
    item.actedAt,
    item.note ?? "",
  ]);

  return `\uFEFF${[
    columns.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n")}\r\n`;
}
