"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500">
          Visão geral da operação da clínica hoje.
        </p>
      </div>

      {/* MÉTRICAS PRINCIPAIS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Consultas hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">12</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Confirmadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">8</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">3</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Canceladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">1</div>
          </CardContent>
        </Card>
      </div>

      {/* AÇÕES RÁPIDAS */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Ações rápidas</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => router.push("/admin/agenda")}>
            Ver agenda
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/admin/appointments/new")}
          >
            Novo agendamento
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/admin/people")}
          >
            Buscar cliente
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/admin/professionals")}
          >
            Profissionais
          </Button>
        </CardContent>
      </Card>

      {/* PRÓXIMOS HORÁRIOS */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Próximos horários</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="font-medium text-slate-900">08:30</span>
            <span className="text-slate-600">Maria Silva</span>
            <span className="text-slate-500">ASO</span>
          </div>

          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="font-medium text-slate-900">08:45</span>
            <span className="text-slate-600">João Pereira</span>
            <span className="text-slate-500">Periódico</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-900">09:00</span>
            <span className="text-slate-600">Ana Costa</span>
            <span className="text-slate-500">Retorno</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
