import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  MessageCircleMore,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: CalendarDays,
    title: "Agenda clínica organizada",
    description:
      "Visualize horários, acompanhe disponibilidade e gerencie agendamentos com mais clareza.",
  },
  {
    icon: MessageCircleMore,
    title: "Confirmação via WhatsApp",
    description:
      "Automatize confirmações e comunicações com pacientes usando fluxos integrados.",
  },
  {
    icon: Users,
    title: "Gestão de pessoas e profissionais",
    description:
      "Cadastre clientes, profissionais e empresas em uma operação centralizada.",
  },
  {
    icon: ShieldCheck,
    title: "Arquitetura robusta",
    description:
      "Base preparada com backend, outbox, workers e automações para escalar com segurança.",
  },
];

const highlights = [
  {
    icon: Stethoscope,
    title: "Voltado para clínicas",
    text: "Especialmente útil para operações de medicina ocupacional e rotinas clínicas recorrentes.",
  },
  {
    icon: CalendarDays,
    title: "Fluxo operacional real",
    text: "Do agendamento à confirmação, o sistema acompanha o dia da clínica de forma prática.",
  },
  {
    icon: MessageCircleMore,
    title: "Automação integrada",
    text: "O SISAG conecta agenda, operação e comunicação em uma experiência centralizada.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              SISAG
            </p>
            <p className="text-sm text-slate-600">
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

      {/* HERO */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              Plataforma SaaS para operação clínica
            </div>

            <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Transforme a agenda clínica em uma operação visível, organizada e
              automatizada.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              O SISAG centraliza agendamentos, profissionais, clientes e
              confirmações via WhatsApp em uma experiência moderna, pensada para
              clínicas que precisam de eficiência operacional.
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
          </div>

          <div>
            <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <div className="border-b border-slate-200 bg-white px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Visão operacional do SISAG
                  </p>
                  <p className="text-sm text-slate-500">
                    Dashboard, agenda e automação em um fluxo unificado.
                  </p>
                </div>

                <div className="grid gap-4 bg-slate-100 p-5 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Agendamentos hoje</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">12</p>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Confirmados</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">8</p>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm sm:col-span-2">
                    <p className="text-sm text-slate-500">Próximos horários</p>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-900">
                          08:30
                        </span>
                        <span className="text-slate-600">Maria Silva</span>
                        <span className="text-slate-500">Confirmado</span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-900">
                          08:45
                        </span>
                        <span className="text-slate-600">João Pereira</span>
                        <span className="text-slate-500">Pendente</span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-900">
                          09:00
                        </span>
                        <span className="text-emerald-700">Disponível</span>
                        <span className="text-slate-500">Novo agendamento</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8 lg:pb-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            O que o SISAG entrega
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Um sistema pensado para tornar a operação clínica mais simples e
            visível.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                className="rounded-2xl border-slate-200"
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

      {/* HIGHLIGHTS */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Pensado para a rotina da clínica
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              O SISAG foi estruturado para conectar agenda, cadastros e
              comunicação em um fluxo operacional consistente.
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

      {/* CTA FINAL */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
        <div className="rounded-3xl bg-slate-900 px-6 py-10 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">
                Comece a usar o SISAG
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Entre no sistema e acompanhe a agenda, os agendamentos e a
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
