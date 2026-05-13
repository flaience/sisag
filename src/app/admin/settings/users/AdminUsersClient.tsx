//src/app/admin/settings/users/AdminUsersClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { actionRequest } from "@/lib/ui/actionRequest";

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

export function AdminUsersClient() {
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

      const result = await actionRequest<{
        invites: InviteItem[];
      }>("/api/v1/invites");

      if (!result.ok) {
        const message =
          "error" in result && typeof result.error === "string"
            ? result.error
            : "message" in result && typeof result.message === "string"
              ? result.message
              : "Não foi possível carregar os convites.";

        throw new Error(message);
      }
      setInvites(result.data.invites ?? []);
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

      const result = await actionRequest<{
        ok: true;
        invite: {
          id: string;
          email: string;
          role: string;
          expiresAt: string;
          inviteUrl: string;
        };
      }>("/api/v1/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role,
        }),
      });

      if (!result.ok) {
        const message =
          "error" in result && typeof result.error === "string"
            ? result.error
            : "message" in result && typeof result.message === "string"
              ? result.message
              : "Não foi possível carregar os convites.";

        throw new Error(message);
      }

      setSuccess("Convite criado com sucesso.");
      setLatestInviteUrl(result.data.invite?.inviteUrl ?? "");
      setEmail("");
      setRole("staff");

      await loadInvites();
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
          className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"
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
              className="w-full rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60 md:w-auto"
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

            <div className="mt-2 flex flex-col gap-2">
              <input
                readOnly
                value={latestInviteUrl}
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
              />

              <button
                type="button"
                onClick={() => handleCopy(latestInviteUrl)}
                className="w-full rounded-xl border px-4 py-2 text-sm md:w-auto"
              >
                Copiar link
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Convites pendentes</h2>
            <p className="text-sm text-slate-600">
              {pendingInvites.length} convite(s) pendente(s)
            </p>
          </div>

          <button
            type="button"
            onClick={loadInvites}
            className="w-full rounded-xl border px-4 py-2 text-sm md:w-auto"
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
          <div className="mt-4 space-y-3">
            {pendingInvites.map((invite) => (
              <article
                key={invite.id}
                className="rounded-2xl border bg-slate-50 p-4"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Email
                    </p>
                    <p className="text-sm">{invite.email}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Perfil
                    </p>
                    <p className="text-sm">{invite.role}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Criado em
                    </p>
                    <p className="text-sm">
                      {formatDateTime(invite.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Expira em
                    </p>
                    <p className="text-sm">
                      {formatDateTime(invite.expiresAt)}
                    </p>
                  </div>

                  <div className="md:col-span-1">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Ações
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopy(invite.inviteUrl)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm md:w-auto"
                    >
                      Copiar link
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <input
                    readOnly
                    value={invite.inviteUrl}
                    className="w-full rounded-xl border bg-white px-3 py-2 text-xs"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
