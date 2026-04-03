import { BusinessType, normalizeBusinessType } from "@/lib/business-types";

export function getPersonLabel(type?: BusinessType | string | null) {
  const normalized = normalizeBusinessType(type);

  switch (normalized) {
    case "sisag":
    case "occupational_health":
      return "Pacientes";

    case "barbershop":
    case "salon":
      return "Clientes";

    case "generic":
    default:
      return "Pessoas";
  }
}

export function getPersonLabelSingular(type?: BusinessType | string | null) {
  const normalized = normalizeBusinessType(type);

  switch (normalized) {
    case "sisag":
    case "occupational_health":
      return "Paciente";

    case "barbershop":
    case "salon":
      return "Cliente";

    case "generic":
    default:
      return "Pessoa";
  }
}
