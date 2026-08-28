"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;
export function CompanyLogoManager() {
  const input = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  async function load() { try { const response = await fetch("/api/v1/me/company/brand/logo", { cache: "no-store" }); const body = await response.json().catch(() => null); if (response.ok && body?.ok === true) setLogoUrl(body.logoUrl ?? null); } catch { setFeedback({ type: "error", message: "Não foi possível carregar o logotipo." }); } }
  useEffect(() => { void load(); }, []);
  async function upload(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) { setFeedback({ type: "error", message: "Escolha uma imagem PNG, JPEG ou WebP de até 2 MB." }); return; }
    setBusy(true); setFeedback(null);
    try { const data = new FormData(); data.set("file", file); const response = await fetch("/api/v1/me/company/brand/logo", { method: "POST", body: data }); const body = await response.json().catch(() => null); if (!response.ok || body?.ok !== true) throw new Error(body?.message ?? "upload_failed"); await load(); window.dispatchEvent(new Event("company-brand-updated")); setFeedback({ type: "success", message: "Logotipo atualizado com segurança." }); }
    catch (error) { setFeedback({ type: "error", message: error instanceof Error && error.message !== "upload_failed" ? error.message : "Não foi possível enviar o logotipo." }); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function remove() {
    setBusy(true); setFeedback(null);
    try { const response = await fetch("/api/v1/me/company/brand/logo", { method: "DELETE" }); const body = await response.json().catch(() => null); if (!response.ok || body?.ok !== true) throw new Error("remove_failed"); setLogoUrl(null); window.dispatchEvent(new Event("company-brand-updated")); setFeedback({ type: "success", message: "Logotipo removido. A identidade padrão será utilizada." }); }
    catch { setFeedback({ type: "error", message: "Não foi possível remover o logotipo." }); }
    finally { setBusy(false); }
  }
  return <Card className="rounded-2xl border-slate-200 shadow-sm"><CardHeader><CardTitle>Identidade visual</CardTitle><CardDescription>Personalize o ambiente da equipe. Use uma imagem nítida, com fundo transparente ou claro.</CardDescription></CardHeader><CardContent className="space-y-4">{feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}<div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 sm:flex-row sm:items-center"><div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm">{logoUrl ? <img src={logoUrl} alt="Logotipo atual" className="h-full w-full object-contain p-2" /> : <ImagePlus className="h-8 w-8 text-slate-300" />}</div><div className="space-y-3"><div><p className="font-medium text-slate-800">Logotipo da empresa</p><p className="text-sm text-slate-500">PNG, JPEG ou WebP · máximo de 2 MB.</p></div><div className="flex flex-wrap gap-2"><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} /><Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />{logoUrl ? "Substituir imagem" : "Escolher imagem"}</Button>{logoUrl ? <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove()} className="text-red-600 hover:text-red-700"><Trash2 className="mr-2 h-4 w-4" />Remover</Button> : null}</div></div></div></CardContent></Card>;
}
