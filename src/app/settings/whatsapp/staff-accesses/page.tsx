import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WhatsAppStaffAccessManagementClient } from "@/modules/assistant/staff/WhatsAppStaffAccessManagement.client";

export default function WhatsAppStaffAccessesPage(){return <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8"><header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold">Acessos da equipe pelo WhatsApp</h1><p className="text-muted-foreground">Controle quem pode consultar informações da agenda pelo canal.</p></div><Button asChild variant="outline"><Link href="/settings/whatsapp">Voltar para WhatsApp</Link></Button></header><WhatsAppStaffAccessManagementClient/></main>}
