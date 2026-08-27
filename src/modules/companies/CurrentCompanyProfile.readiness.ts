import type { CurrentCompanyProfile } from "./CurrentCompanyProfile.service";

export function getCurrentCompanyProfileReadiness(profile: CurrentCompanyProfile) {
  const checks = [
    { key: "identity", label: "Nome da empresa", complete: profile.name.trim().length >= 3 },
    { key: "contact", label: "Telefone ou e-mail", complete: Boolean(profile.phone?.trim() || profile.email?.trim()) },
    { key: "address", label: "Endereço operacional", complete: Boolean(profile.address?.trim()) },
    { key: "business", label: "Tipo de negócio", complete: Boolean(profile.businessType?.trim()) },
  ];
  const completed = checks.filter((check) => check.complete).length;
  return { checks, completed, total: checks.length, ready: completed === checks.length, percentage: Math.round((completed / checks.length) * 100) };
}
