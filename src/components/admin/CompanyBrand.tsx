"use client";

import { useCallback, useEffect, useState } from "react";
import { getCompanyDisplayName, getCompanyInitials } from "@/modules/companies/CompanyBrandIdentity.presentation";

type Brand = { name: string; tradeName: string | null; logoUrl: string | null };
const fallback: Brand = { name: "SISAG", tradeName: null, logoUrl: null };

export function CompanyBrand({ compact = false }: { compact?: boolean }) {
  const [brand, setBrand] = useState<Brand>(fallback);
  const load = useCallback(async () => {
    try {
      const [profileResponse, logoResponse] = await Promise.all([
        fetch("/api/v1/me/company/profile", { cache: "no-store" }),
        fetch("/api/v1/me/company/brand/logo", { cache: "no-store" }),
      ]);
      const profile = await profileResponse.json().catch(() => null);
      const logo = await logoResponse.json().catch(() => null);
      if (profileResponse.ok && profile?.ok === true && profile.item) setBrand({ name: profile.item.name ?? "SISAG", tradeName: profile.item.tradeName ?? null, logoUrl: logoResponse.ok && logo?.ok === true ? logo.logoUrl ?? null : null });
    } catch { setBrand(fallback); }
  }, []);
  useEffect(() => { void load(); const refresh = () => void load(); window.addEventListener("company-brand-updated", refresh); return () => window.removeEventListener("company-brand-updated", refresh); }, [load]);
  const identity = { name: brand.name, tradeName: brand.tradeName };
  return <div className="flex min-w-0 items-center gap-3">
    {brand.logoUrl ? <img src={brand.logoUrl} alt="Logotipo da empresa" className={compact ? "h-9 w-9 rounded-xl object-contain" : "h-11 w-11 rounded-xl object-contain"} /> : <span className={compact ? "grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-xs font-bold text-white" : "grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white"}>{getCompanyInitials(identity)}</span>}
    <div className="min-w-0"><p className={compact ? "truncate text-base font-semibold" : "truncate text-lg font-semibold"}>{getCompanyDisplayName(identity)}</p>{compact ? null : <p className="text-xs text-slate-500">Gestão de agenda e atendimento</p>}</div>
  </div>;
}
