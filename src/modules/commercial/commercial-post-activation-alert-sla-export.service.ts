import type { CommercialPostActivationAlertSlaItem } from "./commercial-post-activation-alert-sla.service";

const columns = [
  "alerta",
  "severidade",
  "situacao",
  "aberto_em",
  "reconhecido_em",
  "resolvido_em",
  "minutos_ate_reconhecimento",
  "meta_reconhecimento_minutos",
  "reconhecimento_fora_sla",
  "minutos_ate_resolucao",
  "meta_resolucao_minutos",
  "resolucao_fora_sla",
] as const;

function safeSpreadsheetValue(value: string) {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number | boolean | null) {
  const safe = safeSpreadsheetValue(value === null ? "" : String(value));
  return `"${safe.replaceAll('"', '""')}"`;
}

export function exportCommercialPostActivationAlertSlaCsv(
  items: CommercialPostActivationAlertSlaItem[],
) {
  const rows = items.map((item) => [
    item.alertKey,
    item.severity,
    item.lifecycle,
    item.openedAt,
    item.acknowledgedAt,
    item.resolvedAt,
    item.acknowledgementMinutes,
    item.acknowledgementTargetMinutes,
    item.acknowledgementBreached,
    item.resolutionMinutes,
    item.resolutionTargetMinutes,
    item.resolutionBreached,
  ]);
  return `\uFEFF${[columns.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\r\n")}\r\n`;
}
