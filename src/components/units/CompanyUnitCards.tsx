import { Building2, MapPin, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type CompanyUnitView = {
  id: string; code: string; name: string; timeZone: string; phone: string | null; email: string | null;
  postalCode: string | null; street: string | null; number: string | null; complement: string | null;
  district: string | null; city: string | null; state: string | null; countryCode: string;
  isDefault: boolean; active: boolean;
};

export function formatCompanyUnitAddress(unit: CompanyUnitView) {
  const street = [unit.street, unit.number].filter(Boolean).join(", ");
  const locality = [unit.district, unit.city, unit.state].filter(Boolean).join(" · ");
  return [street, unit.complement, locality, unit.postalCode].filter(Boolean).join(" — ") || "Endereço ainda não informado";
}

export function CompanyUnitCards({ items, onEdit }: { items: CompanyUnitView[]; onEdit: (item: CompanyUnitView) => void }) {
  if (items.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><Building2 className="mx-auto h-9 w-9 text-slate-400" /><h2 className="mt-3 font-semibold text-slate-900">Nenhum local cadastrado</h2><p className="mt-1 text-sm text-slate-500">Informe o local principal onde os atendimentos acontecem.</p></div>;
  return <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => <Card key={item.id} className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-950">{item.name}</h2>{item.isDefault ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"><Star className="h-3 w-3" />Local principal</span> : null}<span className={item.active ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"}>{item.active ? "Ativa" : "Inativa"}</span></div><p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Código {item.code}</p></div><Button type="button" variant="outline" size="sm" onClick={() => onEdit(item)}><Pencil className="mr-2 h-3.5 w-3.5" />Editar</Button></div><div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600"><p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{formatCompanyUnitAddress(item)}</span></p>{item.phone || item.email ? <p>{[item.phone, item.email].filter(Boolean).join(" · ")}</p> : null}</div></CardContent></Card>)}</div>;
}
