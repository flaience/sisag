export type TrustedArrivalPeriodCandidate = {
  serviceName: string;
  unitName: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  registered: number;
};

export type ArrivalOrderAnswerCandidate = {
  kind: "arrival_order_availability";
  status: "ready" | "empty" | "failed";
  text: string;
  attendanceDate: string;
  periodCount: number;
  source: "read_only_tool";
};

const safe = (value: string, fallback: string) => value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || fallback;
const time = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;

export function createArrivalOrderAnswerCandidate(input: { ok: boolean; attendanceDate: string; periods?: TrustedArrivalPeriodCandidate[] }): ArrivalOrderAnswerCandidate {
  if (!input.ok || !/^20\d{2}-\d{2}-\d{2}$/.test(input.attendanceDate)) return { kind: "arrival_order_availability", status: "failed", text: "Não foi possível consultar os períodos por ordem de chegada agora.", attendanceDate: input.attendanceDate, periodCount: 0, source: "read_only_tool" };
  const periods = (input.periods ?? []).slice(0, 5).flatMap((item) => {
    const start = time(item.startTime); const end = time(item.endTime);
    if (!start || !end || end <= start || item.registered < 0 || (item.capacity !== null && item.capacity < 1)) return [];
    const remaining = item.capacity === null ? null : Math.max(0, item.capacity - item.registered);
    if (remaining === 0) return [];
    return [{ serviceName: safe(item.serviceName, "Serviço"), unitName: safe(item.unitName, "Unidade"), start, end, remaining }];
  });
  const formattedDate = input.attendanceDate.split("-").reverse().join("/");
  if (periods.length === 0) return { kind: "arrival_order_availability", status: "empty", text: "Não encontrei período disponível por ordem de chegada para " + formattedDate + ".", attendanceDate: input.attendanceDate, periodCount: 0, source: "read_only_tool" };
  const prefix = "Períodos por ordem de chegada em " + formattedDate + ":\n";
  const suffix = "\nNenhum horário ou posição na fila foi reservado.";
  const lines: string[] = [];
  for (const item of periods) {
    const line = (lines.length + 1) + ". " + item.serviceName + " — " + item.unitName + " — " + item.start + " às " + item.end + (item.remaining === null ? "" : " — " + item.remaining + " vaga(s) restante(s)");
    if ((prefix + [...lines, line].join("\n") + suffix).length > 500) break;
    lines.push(line);
  }
  if (lines.length === 0) return { kind: "arrival_order_availability", status: "failed", text: "Não foi possível apresentar os períodos por ordem de chegada agora.", attendanceDate: input.attendanceDate, periodCount: 0, source: "read_only_tool" };
  return { kind: "arrival_order_availability", status: "ready", text: prefix + lines.join("\n") + suffix, attendanceDate: input.attendanceDate, periodCount: lines.length, source: "read_only_tool" };
}
