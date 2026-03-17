export function calculateAppointmentEndTime(
  scheduledTime: Date | string,
  durationMinutes: number,
): Date {
  const start =
    typeof scheduledTime === "string" ? new Date(scheduledTime) : scheduledTime;

  const safeDuration = Math.max(1, Number(durationMinutes || 30));

  return new Date(start.getTime() + safeDuration * 60_000);
}
