"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type InviteData = {
  email: string;
  role: string;
  expiresAt: string;
  companyId: string;
  companyName?: string | null;
};

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function loadInvite() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/v1/invites/${params.token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Falha ao carregar convite");
        }

        setInvite(data.invite);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao carregar convite";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (params?.token) {
      loadInvite();
    }
  }, [params?.token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(`/api/v1/invites/${params.token}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao aceitar convite");
      }

      router.push("/login?invited=1");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao aceitar convite";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          Carregando convite...
        </div>
      </main>
    );
  }

  if (error && !invite) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          {error}
        </div>
      </main>
    );
  }

  if (!invite) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          Convite não encontrado.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Aceitar convite</h1>

        <p className="mt-2 text-sm text-slate-600">
          Você foi convidado para acessar o SISAG
          {invite.companyName ? ` · ${invite.companyName}` : ""}.
        </p>

        <div className="mt-4 rounded-xl border p-4 text-sm space-y-1">
          <p>
            <strong>Email:</strong> {invite.email}
          </p>
          <p>
            <strong>Perfil:</strong> {invite.role}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Nome</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Senha</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Confirmar senha</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {submitting ? "Criando acesso..." : "Criar acesso"}
          </button>
        </form>
      </div>
    </main>
  );
}
