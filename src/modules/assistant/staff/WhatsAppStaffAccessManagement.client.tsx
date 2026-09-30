"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Role = "manager" | "professional";
type Access = { id:string; whatsappAccountId:string; phoneE164:string; role:Role; professionalId:string|null; professionalName:string|null; active:boolean };
type Account = { id:string; provider:string };
type Professional = { id:string; name:string };
type ResponseData = { ok:boolean; items?:Access[]; accounts?:Account[]; professionals?:Professional[]; error?:string };
type Feedback = { type:"success"|"error"|"info"; message:string } | null;

const errorMessages:Record<string,string> = {
  duplicate_phone:"Este número já possui acesso nesta conta do WhatsApp.",
  account_not_found:"A conta do WhatsApp não está ativa ou não pertence à empresa.",
  professional_not_found:"O profissional não está ativo ou não pertence à empresa.",
  access_not_found:"O acesso não foi encontrado.",
  invalid_staff_access:"Revise os dados informados.",
};

export function WhatsAppStaffAccessManagementClient(){
  const [items,setItems]=useState<Access[]>([]),[accounts,setAccounts]=useState<Account[]>([]),[professionals,setProfessionals]=useState<Professional[]>([]);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[feedback,setFeedback]=useState<Feedback>(null);
  const [editingId,setEditingId]=useState<string|null>(null),[accountId,setAccountId]=useState(""),[phone,setPhone]=useState(""),[role,setRole]=useState<Role>("manager"),[professionalId,setProfessionalId]=useState("");

  const load=useCallback(async()=>{setLoading(true);try{const response=await fetch("/api/v1/settings/whatsapp/staff-accesses",{cache:"no-store"});const data:ResponseData=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||"load_failed");setItems(data.items||[]);setAccounts(data.accounts||[]);setProfessionals(data.professionals||[]);setAccountId(current=>current||(data.accounts?.[0]?.id||""))}catch{setFeedback({type:"error",message:"Não foi possível carregar os acessos da equipe."})}finally{setLoading(false)}},[]);
  useEffect(()=>{void load()},[load]);

  const editing=useMemo(()=>items.find(item=>item.id===editingId)||null,[items,editingId]);
  function reset(){setEditingId(null);setPhone("");setRole("manager");setProfessionalId("");setAccountId(accounts[0]?.id||"")}
  function edit(item:Access){setEditingId(item.id);setAccountId(item.whatsappAccountId);setPhone(item.phoneE164);setRole(item.role);setProfessionalId(item.professionalId||"");setFeedback(null);window.scrollTo({top:0,behavior:"smooth"})}

  async function submit(event:React.FormEvent){event.preventDefault();setFeedback(null);if(!accountId||!phone.trim()||(role==="professional"&&!professionalId)){setFeedback({type:"error",message:"Preencha a conta, o telefone e, quando aplicável, o profissional."});return}setSaving(true);try{const response=await fetch("/api/v1/settings/whatsapp/staff-accesses",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...(editing?{id:editing.id,active:editing.active}:{}),whatsappAccountId:accountId,phoneE164:phone,role,professionalId:role==="professional"?professionalId:null})});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||"save_failed");setFeedback({type:"success",message:editing?"Acesso atualizado com sucesso.":"Acesso autorizado com sucesso."});reset();await load()}catch(error){const code=error instanceof Error?error.message:"save_failed";setFeedback({type:"error",message:errorMessages[code]||"Não foi possível salvar o acesso."})}finally{setSaving(false)}}

  async function toggle(item:Access){const action=item.active?"desativar":"reativar";if(!window.confirm("Deseja "+action+" o acesso de "+item.phoneE164+"?"))return;setSaving(true);setFeedback(null);try{const response=await fetch("/api/v1/settings/whatsapp/staff-accesses",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,whatsappAccountId:item.whatsappAccountId,phoneE164:item.phoneE164,role:item.role,professionalId:item.professionalId,active:!item.active})});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||"save_failed");setFeedback({type:"success",message:item.active?"Acesso desativado.":"Acesso reativado."});await load()}catch(error){const code=error instanceof Error?error.message:"save_failed";setFeedback({type:"error",message:errorMessages[code]||"Não foi possível alterar o acesso."})}finally{setSaving(false)}}

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>{editing?"Editar acesso":"Autorizar pessoa"}</CardTitle><CardDescription>Cadastre gestores ou vincule profissionais que poderão consultar a agenda pelo próprio WhatsApp.</CardDescription></CardHeader><CardContent>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="account">Conta do WhatsApp</Label><select id="account" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={accountId} onChange={event=>setAccountId(event.target.value)} disabled={saving}><option value="">Selecione</option>{accounts.map(account=><option key={account.id} value={account.id}>{account.provider} · conta ativa</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="phone">Telefone autorizado</Label><Input id="phone" value={phone} onChange={event=>setPhone(event.target.value)} placeholder="+55 54 99999-9999" disabled={saving}/><p className="text-xs text-muted-foreground">Informe o número com DDD. O sistema fará a normalização.</p></div>
        <div className="space-y-2"><Label htmlFor="role">Tipo de acesso</Label><select id="role" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={role} onChange={event=>{const value=event.target.value as Role;setRole(value);if(value==="manager")setProfessionalId("")}} disabled={saving}><option value="manager">Gestor</option><option value="professional">Profissional</option></select></div>
        {role==="professional"?<div className="space-y-2"><Label htmlFor="professional">Profissional vinculado</Label><select id="professional" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={professionalId} onChange={event=>setProfessionalId(event.target.value)} disabled={saving}><option value="">Selecione</option>{professionals.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>:<div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">O gestor consulta a agenda da empresa. Nenhum profissional individual precisa ser vinculado.</div>}
        <div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={saving||accounts.length===0}>{saving?"Salvando...":editing?"Salvar alterações":"Autorizar acesso"}</Button>{editing?<Button type="button" variant="outline" onClick={reset} disabled={saving}>Cancelar edição</Button>:null}</div>
      </form>
      {accounts.length===0&&!loading?<div className="mt-4"><ActionFeedback type="info" message="Nenhuma conta ativa do WhatsApp foi encontrada para esta empresa."/></div>:null}
    </CardContent></Card>
    {feedback?<ActionFeedback type={feedback.type} message={feedback.message}/>:null}
    <Card><CardHeader><CardTitle>Pessoas autorizadas</CardTitle><CardDescription>Desativar preserva o histórico de auditoria e bloqueia novas consultas.</CardDescription></CardHeader><CardContent>
      {loading?<p className="text-sm text-muted-foreground">Carregando acessos...</p>:items.length===0?<p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma pessoa autorizada.</p>:<Table><TableHeader><TableRow><TableHead>Telefone</TableHead><TableHead>Perfil</TableHead><TableHead>Profissional</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{items.map(item=><TableRow key={item.id}><TableCell className="font-mono">{item.phoneE164}</TableCell><TableCell>{item.role==="manager"?"Gestor":"Profissional"}</TableCell><TableCell>{item.professionalName||"—"}</TableCell><TableCell><Badge variant={item.active?"default":"secondary"}>{item.active?"Ativo":"Inativo"}</Badge></TableCell><TableCell className="space-x-2 text-right"><Button size="sm" variant="outline" onClick={()=>edit(item)} disabled={saving}>Editar</Button><Button size="sm" variant={item.active?"destructive":"default"} onClick={()=>void toggle(item)} disabled={saving}>{item.active?"Desativar":"Reativar"}</Button></TableCell></TableRow>)}</TableBody></Table>}
    </CardContent></Card>
  </div>
}
