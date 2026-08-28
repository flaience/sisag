import { BUSINESS_TYPES, type BusinessType, normalizeBusinessType } from "@/lib/business-types";

export const COMPANY_BUSINESS_TYPE_OPTIONS: Array<{ value: BusinessType; label: string }> = [
  { value: "sisag", label: "Clínica ou consultório" },
  { value: "occupational_health", label: "Saúde ocupacional" },
  { value: "salon", label: "Salão, estética ou bem-estar" },
  { value: "barbershop", label: "Barbearia" },
  { value: "generic", label: "Outros serviços" },
];

export function normalizeCompanyBusinessTypeValue(value?: string | null): BusinessType {
  switch (value) {
    case "clinic":
    case "dental":
    case "medical":
      return "sisag";
    case "beauty":
    case "wellness":
      return "salon";
    default:
      return normalizeBusinessType(value);
  }
}

export function getCompanyBusinessTypeLabel(value?: string | null) {
  const normalized = normalizeCompanyBusinessTypeValue(value);
  return COMPANY_BUSINESS_TYPE_OPTIONS.find((item) => item.value === normalized)?.label ?? "Outros serviços";
}

export function isCompanyBusinessType(value: string): value is BusinessType {
  return (BUSINESS_TYPES as readonly string[]).includes(value);
}
