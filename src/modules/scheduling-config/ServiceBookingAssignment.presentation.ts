export const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"] as const;
export function assignmentServiceLabel(serviceName?: string | null) { return serviceName?.trim() || "Todos os serviços do turno"; }
export function assignmentPeriodLabel(input: { weekday: number; startTime: string; endTime: string }) { return `${WEEKDAYS[input.weekday] ?? "Dia inválido"}, das ${input.startTime} às ${input.endTime}`; }
export function assignmentPrecedenceLabel(serviceName?: string | null) { return serviceName ? "Regra específica: será considerada antes do padrão geral do turno." : "Regra geral: será usada quando não houver uma regra específica para o serviço."; }
