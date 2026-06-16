//src/app/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck, CalendarDays, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Falha ao entrar.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setErrorMsg("Erro ao processar login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="hidden bg-slate-900 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="p-10">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              SISAG
            </div>

            <div className="mt-6 max-w-xl">
              <h1 className="text-4xl font-bold leading-tight">
                Gestão clínica com agenda, operação e automação em um só lugar.
              </h1>

              <p className="mt-4 text-base text-slate-300">
                Organize agendamentos, acompanhe profissionais, gerencie
                clientes e automatize confirmações com WhatsApp em uma
                experiência centralizada.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-10">
            <Card className="border-slate-800 bg-slate-950/50 text-white shadow-none">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="rounded-xl bg-slate-800 p-3">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Agenda clínica centralizada</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Visualize horários livres e ocupados com mais clareza.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/50 text-white shadow-none">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="rounded-xl bg-slate-800 p-3">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">
                    Gestão de pessoas e profissionais
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Cadastros organizados para uma operação mais fluida.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/50 text-white shadow-none">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="rounded-xl bg-slate-800 p-3">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Base robusta e confiável</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Backend, outbox, workers e automações já preparados para o
                    crescimento do sistema.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 lg:hidden">
                SISAG
              </div>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Entrar no sistema
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Acesse o painel administrativo da clínica.
              </p>
            </div>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="voce@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="password">Senha</Label>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-slate-500 hover:text-slate-900"
                      >
                        Esqueceu a senha?
                      </Link>
                    </div>

                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="pr-11"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        aria-label={
                          showPassword ? "Ocultar senha" : "Mostrar senha"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {errorMsg}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-xl"
                    disabled={loading}
                  >
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-slate-500 lg:text-left">
              SISAG • Gestão clínica e agendamentos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
