export function getPersonLabel(businessType: string) {
  switch (businessType) {
    case "clinic":
      return "Paciente";

    case "vet":
      return "Tutor";

    case "education":
      return "Aluno";

    case "alternative":
      return "Paciente";

    case "beauty":
    case "automotive":
    case "professional":
    case "generic":
    default:
      return "Cliente";
  }
}

export const businessTypes = [
  { value: "clinic", label: "Clínica médica / odontológica" },
  { value: "beauty", label: "Beleza e estética" },
  {
    value: "professional",
    label: "Profissional liberal (advogado, contador...)",
  },
  { value: "automotive", label: "Serviços automotivos" },
  { value: "education", label: "Educação / aulas" },
  { value: "vet", label: "Veterinária / Pets" },
  { value: "alternative", label: "Saúde alternativa" },
  { value: "generic", label: "Genérico / Outros" },
];
