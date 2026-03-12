export const BUSINESS_TYPES = [
  "generic",
  "clinic",
  "occupational_health",
  "barbershop",
  "salon",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export function normalizeBusinessType(value?: string | null): BusinessType {
  switch (value) {
    case "clinic":
    case "occupational_health":
    case "barbershop":
    case "salon":
    case "generic":
      return value;
    default:
      return "generic";
  }
}
