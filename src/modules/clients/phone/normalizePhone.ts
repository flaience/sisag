export function normalizePhoneE164(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return input;

  // Brasil com DDI: 55 + DDD(2) + número(8)
  // Ex: 555492056187 -> 5554992056187
  if (digits.startsWith("55") && digits.length === 12) {
    const country = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);

    if (local.startsWith("9")) {
      return `+${country}${ddd}9${local}`;
    }

    return `+${digits}`;
  }

  // Brasil sem DDI: DDD(2) + número(8)
  // Ex: 5492056187 -> 5554992056187
  if (!digits.startsWith("55") && digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);

    if (local.startsWith("9")) {
      return `+55${ddd}9${local}`;
    }

    return `+55${digits}`;
  }

  if (digits.startsWith("55")) return `+${digits}`;
  if (digits.length >= 10) return `+55${digits}`;

  return `+${digits}`;
}
