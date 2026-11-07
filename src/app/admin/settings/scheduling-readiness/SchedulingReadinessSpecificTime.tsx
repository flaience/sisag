"use client";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Clock3, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Reason = "available" | "outside_professional_schedule" | "outside_assignment" | "assigned_to_other_professional" | "unavailable_after_configuration";
type Diagnosis = { available: boolean; reason: Reason; assignedProfessional: { professionalId: string; professionalName: string } | null; alternatives: Array<{ startTime: string; time: string }>; evidence: { scheduleCovered: boolean; assignmentCovered: boolean; exactSlotExists: boolean }; readOnly: true };
const messages: Record<Exclude<Reason, "available" | "assigned_to_other_professional">, { title: string; description: string }> = {
  outside_professional_schedule: { title: "Horário fora da jornada do profissional", description: "Não existe um período de atendimento que cubra integralmente esse horário e a duração do serviço." },
  outside_assignment: { title: "Horário fora da distribuição por turno", description: "A jornada existe, mas nenhuma regra ativa direciona esse serviço ao profissional nesse período." },
  unavailable_after_configuration: { title: "Horário indisponível após validar jornada e distribuição", description: "A jornada e a distribuição estão corretas. O horário foi retirado por bloqueio, ocupação ou falta de capacidade de outro recurso necessário." },
};

export function SchedulingReadinessSpecificTime({ unitId, serviceId, professionalId }: { unitId: string; serviceId: string; professionalId: string }) {
  const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [checking, setChecking] = useState(false); const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null); const [error, setError] = useState(false);
  async function check() {
    if (!date || !time) return;
    setChecking(true); setError(false); setDiagnosis(null);
    try {
      const query = new URLSearchParams({ unitId, serviceId, professionalId, date, time });
      const response = await fetch("/api/v1/scheduling/readiness/specific-time?" + query.toString(), { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true || !body.diagnosis) throw new Error("diagnosis");
      setDiagnosis(body.diagnosis as Diagnosis);
    } catch { setError(true); }
    finally { setChecking(false); }
  }
  const assignedElsewhere = diagnosis?.reason === "assigned_to_other_professional";
  const unavailableCopy = diagnosis && !diagnosis.available && !assignedElsewhere ? messages[diagnosis.reason as keyof typeof messages] : null;
  return <Card className="rounded-2xl border-slate-200"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock3 className="h-5 w-5" />Testar uma data e horário</CardTitle><CardDescription>Descubra se o horário é oferecido e, caso não seja, qual parte da configuração o impede.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"><div><Label>Data</Label><Input className="mt-1" type="date" value={date} onChange={(event) => { setDate(event.target.value); setDiagnosis(null); }} /></div><div><Label>Horário</Label><Input className="mt-1" type="time" value={time} onChange={(event) => { setTime(event.target.value); setDiagnosis(null); }} /></div><div className="flex items-end"><Button disabled={!date || !time || checking} onClick={() => void check()}><Search className="mr-2 h-4 w-4" />{checking ? "Diagnosticando..." : "Diagnosticar horário"}</Button></div></div>
    {error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Não foi possível diagnosticar esse horário agora. Tente novamente.</p> : null}
    {diagnosis ? diagnosis.available ? <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" /><div><p className="font-medium text-emerald-950">Horário disponível para o profissional selecionado</p><p className="mt-1 text-sm text-emerald-800">Jornada, distribuição e disponibilidade oficial aprovaram o horário.</p></div></div> : <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4"><XCircle className="h-5 w-5 shrink-0 text-rose-700" /><div><p className="font-medium text-rose-950">{assignedElsewhere ? "Horário direcionado para outro profissional" : unavailableCopy?.title}</p><p className="mt-1 text-sm text-rose-800">{assignedElsewhere ? "A regra de distribuição direcionou esse horário para " + diagnosis.assignedProfessional?.professionalName + "." : unavailableCopy?.description}</p>{diagnosis.reason === "outside_professional_schedule" ? <Link className="mt-3 inline-flex text-sm font-medium text-blue-700 underline" href={"/admin/professionals/" + professionalId + "/availability"}>Corrigir jornada do profissional</Link> : null}{diagnosis.reason === "outside_assignment" ? <Link className="mt-3 inline-flex text-sm font-medium text-blue-700 underline" href="/admin/settings/service-assignments">Corrigir distribuição por turno</Link> : null}{diagnosis.reason === "unavailable_after_configuration" ? <Link className="mt-3 inline-flex text-sm font-medium text-blue-700 underline" href="/admin/settings/availability-exceptions">Revisar feriados e bloqueios</Link> : null}{diagnosis.alternatives.length ? <p className="mt-3 text-sm text-slate-700">Alternativas mais próximas: <strong>{diagnosis.alternatives.map((item) => item.time).join(", ")}</strong>.</p> : <p className="mt-3 text-sm text-slate-700">Nenhuma alternativa foi encontrada para esse profissional nesta data.</p>}</div></div> : null}
    <p className="text-xs text-slate-500">Diagnóstico somente leitura. Nenhum horário será reservado ou alterado.</p>
  </CardContent></Card>;
}
