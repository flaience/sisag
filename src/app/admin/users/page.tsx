"use client";

import { useEffect, useMemo, useState } from "react";

type InviteItem = {
  id: string;
  email: string;
  role: "owner" | "admin" | "staff";
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  inviteUrl: string;
};

type LoadState = "idle" | "loading" | "success" | "error";

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function AdminUsersPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin" | "owner">("staff");

  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [latestInviteUrl, setLatestInviteUrl] = useState("");

  async function loadInvites() {
    try {
      setLoadState("loading");
      setError("");

      const response = await fetch("/api/v1/invites", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao carregar convites");
      }

      setInvites(data.invites ?? []);
      setLoadState("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar convites";

      setError(message);
      setLoadState("error");
    }
  }

  useEffect(() => {
    loadInvites();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      setLatestInviteUrl("");

      const response = await fetch("/api/v1/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao criar convite");
      }

      setSuccess("Convite criado com sucesso.");
      setLatestInviteUrl(data.invite?.inviteUrl ?? "");
      setEmail("");
      setRole("staff");

      await loadInvites();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar convite";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setSuccess("Link copiado.");
      setError("");
    } catch {
      setError("Não foi possível copiar o link.");
    }
  }

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === "pending"),
    [invites],
  );

  return (
    <main className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Usuários e convites
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Convide novos usuários para acessar a empresa no SISAG.
        </p>
      </div>

      <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold">Novo convite</h2>

        <form
          onSubmit={handleSubmit}
          className="mt-4 grid gap-4 md:grid-cols-3"
        >
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Perfil</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "staff" | "admin" | "owner")
              }
            >
              <option value="staff">staff</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {submitting ? "Criando convite..." : "Criar convite"}
            </button>
          </div>
        </form>

        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {latestInviteUrl ? (
          <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
            <p className="text-sm font-medium">Link gerado</p>
            <div className="mt-2 flex flex-col gap-2 md:flex-row">
              <input
                readOnly
                value={latestInviteUrl}
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => handleCopy(latestInviteUrl)}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Copiar link
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Convites pendentes</h2>
            <p className="text-sm text-slate-600">
              {pendingInvites.length} convite(s) pendente(s)
            </p>
          </div>

          <button
            type="button"
            onClick={loadInvites}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Atualizar
          </button>
        </div>

        {loadState === "loading" ? (
          <div className="mt-4 text-sm text-slate-600">
            Carregando convites...
          </div>
        ) : pendingInvites.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed p-6 text-sm text-slate-600">
            Nenhum convite pendente.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Perfil</th>
                  <th className="px-3 py-2">Criado em</th>
                  <th className="px-3 py-2">Expira em</th>
                  <th className="px-3 py-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((invite) => (
                  <tr
                    key={invite.id}
                    className="rounded-2xl border bg-slate-50"
                  >
                    <td className="px-3 py-3 text-sm">{invite.email}</td>
                    <td className="px-3 py-3 text-sm">{invite.role}</td>
                    <td className="px-3 py-3 text-sm">
                      {formatDateTime(invite.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {formatDateTime(invite.expiresAt)}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <div className="flex flex-col gap-2 md:flex-row">
                        <input
                          readOnly
                          value={invite.inviteUrl}
                          className="w-full rounded-xl border bg-white px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy(invite.inviteUrl)}
                          className="rounded-xl border px-3 py-2 text-xs"
                        >
                          Copiar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
