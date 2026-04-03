"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { buildSidebarVisibility } from "@/lib/auth/menuPermissions";
import type { AppRole } from "@/lib/auth/permissions";

type AdminShellProps = {
  user: {
    id: string;
    name: string;
    role: AppRole | null;
  };
  children: React.ReactNode;
};

export function AdminShell({ user, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = useMemo(() => {
    return buildSidebarVisibility(user.role).filter((item) => item.visible);
  }, [user.role]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-base font-semibold">SISAG Admin</p>
            <p className="text-xs text-slate-500">
              {user.name} · {user.role ?? "sem perfil"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-xl border p-2"
            aria-label="Abrir menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r bg-white md:block">
          <div className="sticky top-0 flex min-h-screen flex-col">
            <div className="border-b px-5 py-5">
              <h1 className="text-xl font-semibold">SISAG Admin</h1>
              <p className="mt-1 text-sm text-slate-500">
                Gestão clínica e agendamentos
              </p>
            </div>

            <div className="px-4 py-4">
              <div className="rounded-2xl border bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {user.role ?? "sem perfil"}
                </p>
              </div>
            </div>

            <nav className="flex-1 space-y-1 px-3 pb-6">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-30 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            />

            <div className="absolute left-0 top-0 h-full w-[85%] max-w-xs border-r bg-white shadow-xl">
              <div className="border-b px-4 py-4">
                <h1 className="text-lg font-semibold">SISAG Admin</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Gestão clínica e agendamentos
                </p>
              </div>

              <div className="px-4 py-4">
                <div className="rounded-2xl border bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {user.role ?? "sem perfil"}
                  </p>
                </div>
              </div>

              <nav className="space-y-1 px-3 pb-6">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
