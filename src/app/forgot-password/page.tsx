"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const supabase = createSupabaseBrowserClient();

      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://sisag.flaience.com";

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        },
      );

      console.log("[forgot-password] reset result", {
        hasError: !!error,
        message: error?.message,
      });
      if (error) {
        setErrorMsg(error.message || "Não foi possível enviar o e-mail.");
        return;
      }

      setSuccessMsg(
        "Se este e-mail estiver cadastrado, enviaremos as instruções de recuperação.",
      );
    } catch (err: any) {
      console.error("[forgot-password] unexpected error", err);
      setErrorMsg(err?.message ?? "Erro ao solicitar recuperação de senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              SISAG
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Recuperar senha
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Informe seu e-mail para receber as instruções de acesso.
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
                    required
                  />
                </div>

                {successMsg && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {successMsg}
                  </div>
                )}

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
                  {loading ? "Enviando..." : "Enviar instruções"}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/login"
                  className="text-sm text-slate-500 hover:text-slate-900"
                >
                  Voltar para o login
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            Recuperação segura via Supabase Auth
          </div>
        </div>
      </div>
    </div>
  );
}
