"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SisagDataState, SisagPage, SisagPageHeader } from "@/components/sisag";
type Professional = { id: string; name: string; specialty: string | null; status: string | null; avgDuration: number | null };
const inactive = (status: string | null) => status === "INACTIVE" || status === "inactive";
export default function ProfessionalsPage() {
  const [items, setItems] = useState<Professional[]>([]); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(false);
  async function load(term = search) { setLoading(true); setLoadError(false); try { const response = await fetch(term ? "/api/v1/professionals?search=" + encodeURIComponent(term) : "/api/v1/professionals", { cache: "no-store" }); const body = await response.json().catch(() => null); if (!response.ok || body?.ok !== true) throw new Error("load"); setItems(body.items ?? []); } catch { setLoadError(true); } finally { setLoading(false); } }
  useEffect(() => { void load(""); }, []);
  if (loading && items.length === 0) return <SisagPage><SisagDataState state="loading" title="Carregando profissionais" /></SisagPage>;
  if (loadError && items.length === 0) return <SisagPage><SisagDataState state="error" title="Não foi possível carregar os profissionais" action={<Button variant="outline" onClick={() => void load()}>Tentar novamente</Button>} /></SisagPage>;
  return <SisagPage><SisagPageHeader context={<span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" />Equipe de atendimento</span>} title="Profissionais" description="Organize quem atende, seus locais e o tempo médio dos serviços." actions={<Button asChild><Link href="/admin/professionals/new"><Plus className="mr-2 h-4 w-4" />Adicionar profissional</Link></Button>} />
    <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="flex gap-2 p-4"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(search); }} className="pl-9" placeholder="Buscar por nome" /></div><Button variant="outline" onClick={() => void load(search)}>Buscar</Button></CardContent></Card>
    {items.length === 0 ? <SisagDataState state="empty" title="Nenhum profissional cadastrado" description="Adicione o primeiro profissional para começar a configurar a disponibilidade." action={<Button asChild><Link href="/admin/professionals/new">Adicionar profissional</Link></Button>} /> : <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => <Card key={item.id} className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="flex h-full flex-col justify-between gap-5 p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-950">{item.name}</h2><p className="mt-1 text-sm text-slate-500">{item.specialty || "Função não informada"}</p></div><span className={inactive(item.status) ? "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600" : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"}>{inactive(item.status) ? "Inativo" : "Ativo"}</span></div><div className="flex items-center justify-between border-t border-slate-100 pt-4"><p className="text-sm text-slate-500">Atendimento médio: <strong className="text-slate-700">{item.avgDuration ?? 20} min</strong></p><Button asChild variant="outline" size="sm"><Link href={"/admin/professionals/" + item.id + "/edit"}>Editar cadastro</Link></Button></div></CardContent></Card>)}</div>}
  </SisagPage>;
}
