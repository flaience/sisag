//src/app/page.tsx
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: CalendarDays,
    title: "Agenda clínica organizada",
    description:
      "Visualize horários, acompanhe disponibilidade e gerencie agendamentos com mais clareza operacional.",
  },
  {
    icon: MessageCircleMore,
    title: "Confirmação via WhatsApp",
    description:
      "Automatize confirmações e comunicações com pacientes usando fluxos integrados ao dia a dia da clínica.",
  },
  {
    icon: Users,
    title: "Gestão de clientes e profissionais",
    description:
      "Centralize cadastros, vínculos e informações operacionais em uma única experiência de gestão.",
  },
  {
    icon: ShieldCheck,
    title: "Base preparada para escalar",
    description:
      "Arquitetura robusta com backend, workers, outbox e automações para sustentar crescimento com segurança.",
  },
];

const highlights = [
  {
    icon: Stethoscope,
    title: "Pensado para clínicas",
    text: "Especialmente aderente a rotinas de medicina ocupacional, atendimentos recorrentes e operação assistida por agenda.",
  },
  {
    icon: Workflow,
    title: "Fluxo operacional real",
    text: "Do agendamento à confirmação, passando por recursos, comunicação e acompanhamento da jornada.",
  },
  {
    icon: Sparkles,
    title: "Experiência mais visível",
    text: "O SISAG transforma uma operação dispersa em um fluxo claro, centralizado e fácil de acompanhar.",
  },
];

const stats = [
  {
    label: "Agendamentos organizados",
    value: "Agenda",
    helper: "visível e centralizada",
  },
  {
    label: "Comunicação integrada",
    value: "WhatsApp",
    helper: "com mais previsibilidade",
  },
  {
    label: "Operação preparada",
    value: "SaaS",
    helper: "com base robusta",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              SISAG
            </p>
            <p className="truncate text-sm text-slate-600">
              Gestão clínica e agendamentos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/login">Entrar</Link>
            </Button>

            <Button asChild>
              <Link href="/login">Acessar sistema</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-100" />
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-slate-200/40 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Plataforma SaaS para operação clínica
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl xl:text-6xl">
              Transforme a agenda clínica em uma operação{" "}
              <span className="text-slate-700">
                visível, organizada e automatizada.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              O SISAG centraliza agendamentos, profissionais, clientes e
              confirmações via WhatsApp em uma experiência moderna, criada para
              clínicas que precisam de mais eficiência operacional e menos
              dispersão no dia a dia.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 px-6">
                <Link href="/login">
                  Entrar no sistema
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-11 px-6">
                <Link href="/admin">Ver painel</Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-xl shadow-slate-200/50">
              <CardContent className="p-0">
                <div className="border-b border-slate-200 bg-white px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Visão operacional do SISAG
                      </p>
                      <p className="text-sm text-slate-500">
                        Agenda, jornada e comunicação em um fluxo unificado.
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Operação ativa
                    </span>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-100 p-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">
                        Agendamentos hoje
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        12
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">Confirmados</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        8
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-sm text-slate-500">Pendentes</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        3
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-sm font-medium text-slate-900">
                        Próximos horários
                      </p>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm">
                          <div>
                            <p className="font-medium text-slate-900">08:30</p>
                            <p className="text-xs text-slate-500">
                              Maria Silva
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-700">ASO Periódico</p>
                            <p className="text-xs text-emerald-700">
                              Confirmado
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm">
                          <div>
                            <p className="font-medium text-slate-900">08:45</p>
                            <p className="text-xs text-slate-500">
                              João Pereira
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-700">Exame clínico</p>
                            <p className="text-xs text-amber-700">Pendente</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm">
                          <div>
                            <p className="font-medium text-slate-900">09:00</p>
                            <p className="text-xs text-slate-500">Slot livre</p>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-700">Disponível</p>
                            <p className="text-xs text-slate-500">
                              Novo agendamento
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <p className="text-sm font-medium text-slate-900">
                          Comunicação
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          WhatsApp
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Confirmações e lembretes em fluxo integrado.
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm">
                        <p className="text-sm text-slate-300">Automações</p>
                        <p className="mt-2 text-2xl font-bold">Ativas</p>
                        <p className="mt-1 text-sm text-slate-300">
                          Continuidade operacional com visão centralizada.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8 lg:pb-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            O que o SISAG entrega
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Um sistema desenhado para transformar rotina clínica em uma operação
            mais simples, rastreável e visível.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                className="rounded-2xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="p-5">
                  <div className="inline-flex rounded-2xl bg-slate-100 p-3">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Pensado para a rotina da clínica
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              O SISAG conecta agenda, cadastros, comunicação e acompanhamento em
              um fluxo operacional consistente.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="inline-flex rounded-xl bg-white p-3 shadow-sm">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
        <div className="rounded-3xl bg-slate-900 px-6 py-10 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">
                Comece a usar o SISAG
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Entre no sistema e acompanhe agenda, comunicação, automações e
                operação clínica em uma interface centralizada.
              </p>
            </div>

            <Button asChild variant="secondary" className="h-11 px-6">
              <Link href="/login">
                Acessar sistema
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
