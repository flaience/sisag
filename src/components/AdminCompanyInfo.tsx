"use client";

import { Building2 } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";

function formatBusinessType(value?: string | null) {
  if (!value) return "Empresa ativa";

  const normalized = value.replace(/[-_]/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function AdminCompanyInfo() {
  const company = useCompany();

  if (!company) {
    return (
      <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 lg:flex">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Building2 className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">SISAG</p>
          <p className="text-xs text-slate-500">Empresa não identificada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 lg:flex">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <Building2 className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">
          {company.name}
        </p>
        <p className="truncate text-xs text-slate-500">
          {formatBusinessType(company.businessType)}
        </p>
      </div>
    </div>
  );
}
