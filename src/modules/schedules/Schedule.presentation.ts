export const WEEKDAY_LABELS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"] as const;
export type AvailabilityPeriod = { id: string; unitId: string; unitName: string; weekday: number; startTime: string; endTime: string };
export function groupAvailability(periods: AvailabilityPeriod[]) { return WEEKDAY_LABELS.map((label, weekday) => ({ weekday, label, periods: periods.filter((item) => item.weekday === weekday).sort((left, right) => left.startTime.localeCompare(right.startTime) || left.unitName.localeCompare(right.unitName)) })).filter((group) => group.periods.length > 0); }
export function describePeriod(period: AvailabilityPeriod) { return period.startTime + " às " + period.endTime + " · " + period.unitName; }
