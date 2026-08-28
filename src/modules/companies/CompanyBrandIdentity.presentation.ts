export type CompanyBrandIdentity = {
  name: string;
  tradeName?: string | null;
  logoPath?: string | null;
};

export function getCompanyDisplayName(company: CompanyBrandIdentity) {
  return company.tradeName?.trim() || company.name.trim() || "SISAG";
}

export function getCompanyInitials(company: CompanyBrandIdentity) {
  const words = getCompanyDisplayName(company).split(/\s+/).filter(Boolean);
  if (words.length === 0) return "SI";
  const selected = words.length === 1 ? [words[0]!] : [words[0]!, words.at(-1)!];
  return selected.map((word) => Array.from(word)[0] ?? "").join("").toLocaleUpperCase("pt-BR").slice(0, 2);
}
