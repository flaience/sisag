"use client";
import { useState } from "react";
import { CheckCircle2, Clock3, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { evaluateSpecificTimeAvailability, type ReadinessSlot } from "@/modules/scheduling-readiness/SchedulingReadinessSpecificTime";

type Result = ReturnType<typeof evaluateSpecificTimeAvailability> & { timezone: string };

export function SchedulingReadinessSpecificTime({ unitId, serviceId, professionalId }: { unitId: string; serviceId: string; professionalId: string }) {
  const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [checking, setChecking] = useState(false); const [result, setResult] = useState<Result | null>(null); const [error, setError] = useState(false);
  async function check() {
    if (!date || !time) return;
    setChecking(true); setError(false); setResult(null);
    try {
      const query = new URLSearchParams({ unitId, serviceId, date });
      const response = await fetch("/api/v1/scheduling/service-available?" + query.toString(), { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true || !Array.isArray(body.slots) || typeof body.timezone !== "string") throw new Error("availability");
      setResult({ ...evaluateSpecificTimeAvailability({ slots: body.slots as ReadinessSlot[], date, time, timezone: body.timezone, professionalId }), timezone: body.timezone });
    } catch { setError(true); }
    finally { setChecking(false); }
  }
  return <Card className="rounded-2xl border-slate-200"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock3 className="h-5 w-5" />Testar uma data e horário</CardTitle><CardDescription>Confirme se um horário específico é realmente oferecido após considerar jornada, bloqueios, ocupação e distribuição.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"><div><Label>Data</Label><Input className="mt-1" type="date" value={date} onChange={(event) => { setDate(event.target.value); setResult(null); }} /></div><div><Label>Horário</Label><Input className="mt-1" type="time" value={time} onChange={(event) => { setTime(event.target.value); setResult(null); }} /></div><div className="flex items-end"><Button disabled={!date || !time || checking} onClick={() => void check()}><Search className="mr-2 h-4 w-4" />{checking ? "Consultando..." : "Testar horário"}</Button></div></div>
    {error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Não foi possível consultar esse horário agora. Tente novamente.</p> : null}
    {result ? result.available ? <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" /><div><p className="font-medium text-emerald-950">Horário disponível para o profissional selecionado</p><p className="mt-1 text-sm text-emerald-800">O horário passou pela consulta oficial de disponibilidade.</p></div></div> : <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4"><XCircle className="h-5 w-5 shrink-0 text-rose-700" /><div><p className="font-medium text-rose-950">Horário indisponível para o profissional selecionado</p><p className="mt-1 text-sm text-rose-800">{result.assignedToDifferentProfessional ? "Neste horário, a distribuição direcionou o atendimento para " + result.assignedToDifferentProfessional.professionalName + "." : "O horário pode estar fora da jornada, bloqueado, ocupado ou não coberto pela distribuição."}</p>{result.alternatives.length ? <p className="mt-2 text-sm text-slate-700">Alternativas encontradas: <strong>{result.alternatives.map((item) => item.time).join(", ")}</strong>.</p> : <p className="mt-2 text-sm text-slate-700">Nenhuma alternativa foi encontrada para esse profissional nesta data.</p>}</div></div> : null}
    <p className="text-xs text-slate-500">Consulta somente leitura. Nenhum horário será reservado.</p>
  </CardContent></Card>;
}
