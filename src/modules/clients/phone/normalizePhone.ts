export function normalizePhoneE164(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return input;

  // Brasil default
  if (digits.startsWith("55")) return `+${digits}`;
  if (digits.length >= 10) return `+55${digits}`;
  return `+${digits}`;
}
