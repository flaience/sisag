export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateIntervals(
  start: string,
  end: string,
  totalSlot: number
) {
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);

  const intervals: string[] = [];

  for (let t = startMin; t + totalSlot <= endMin; t += totalSlot) {
    intervals.push(toTimeString(t));
  }

  return intervals;
}
