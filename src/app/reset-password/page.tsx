"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function prepareRecoverySession() {
      setErrorMsg(null);

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setErrorMsg(
            error.message ||
              "Link de recuperação inválido ou expirado. Solicite um novo link.",
          );
          setReady(false);
          return;
        }

        window.history.replaceState({}, document.title, "/reset-password");
        setReady(true);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setReady(true);
        return;
      }

      setErrorMsg(
        "Sessão de recuperação não encontrada. Solicite um novo link de recuperação.",
      );
      setReady(false);
    }

    prepareRecoverySession();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (password.length < 6) {
        setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg("As senhas não conferem.");
        return;
      }

      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Não foi possível alterar a senha.");
        return;
      }

      setSuccessMsg("Senha alterada com sucesso. Redirecionando...");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setErrorMsg("Erro ao alterar senha.");
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
              Criar nova senha
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Digite uma nova senha para acessar o painel.
            </p>
          </div>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite sua nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    disabled={!ready || loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirme sua nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    disabled={!ready || loading}
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
                  disabled={!ready || loading}
                >
                  {loading ? "Salvando..." : "Salvar nova senha"}
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
