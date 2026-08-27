export type CurrentBookingCompany = {
  id: string;
  name: string;
};

export function parseCurrentBookingCompanyResponse(
  value: unknown,
): CurrentBookingCompany | null {
  if (!value || typeof value !== "object") return null;

  const response = value as Record<string, unknown>;
  if (response.ok !== true || !response.item || typeof response.item !== "object") {
    return null;
  }

  const item = response.item as Record<string, unknown>;
  if (typeof item.id !== "string" || !item.id.trim()) return null;
  if (typeof item.name !== "string" || !item.name.trim()) return null;

  return { id: item.id, name: item.name };
}
