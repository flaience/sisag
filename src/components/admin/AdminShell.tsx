"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import {
  buildSidebarGroups,
  type AdminNavigationLocale,
} from "@/lib/auth/menuPermissions";
import type { AppRole } from "@/lib/auth/permissions";

type AdminShellProps = {
  user: { id: string; name: string; role: AppRole | null };
  children: React.ReactNode;
  locale?: AdminNavigationLocale;
};

function Navigation({ groups, onNavigate }: {
  groups: ReturnType<typeof buildSidebarGroups>;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-5" aria-label="Navegação principal">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
          <div className="mt-1 space-y-1">
            {group.items.map((item) => (
              <Link key={item.key} href={item.href} onClick={onNavigate} className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function AdminShell({ user, children, locale = "pt-BR" }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = useMemo(() => buildSidebarGroups(user.role, locale), [user.role, locale]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div><p className="text-base font-semibold">SISAG</p><p className="text-xs text-slate-500">{user.name} · {user.role ?? "sem perfil"}</p></div>
          <button type="button" onClick={() => setMobileOpen((value) => !value)} className="rounded-xl border p-2" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}>{mobileOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r bg-white md:block">
          <div className="sticky top-0 flex min-h-screen flex-col">
            <div className="border-b px-5 py-5"><h1 className="text-xl font-semibold">SISAG</h1><p className="mt-1 text-sm text-slate-500">Gestão de agenda e atendimento</p></div>
            <div className="px-4 py-4"><div className="rounded-2xl border bg-slate-50 px-4 py-3"><p className="text-sm font-medium">{user.name}</p><p className="text-xs uppercase tracking-wide text-slate-500">{user.role ?? "sem perfil"}</p></div></div>
            <div className="flex-1 px-3 pb-6"><Navigation groups={groups} /></div>
          </div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-30 md:hidden">
            <button type="button" className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />
            <div className="absolute left-0 top-0 h-full w-[85%] max-w-xs overflow-y-auto border-r bg-white shadow-xl">
              <div className="border-b px-4 py-4"><h1 className="text-lg font-semibold">SISAG</h1><p className="mt-1 text-sm text-slate-500">Gestão de agenda e atendimento</p></div>
              <div className="px-4 py-4"><div className="rounded-2xl border bg-slate-50 px-4 py-3"><p className="text-sm font-medium">{user.name}</p><p className="text-xs uppercase tracking-wide text-slate-500">{user.role ?? "sem perfil"}</p></div></div>
              <div className="px-3 pb-6"><Navigation groups={groups} onNavigate={() => setMobileOpen(false)} /></div>
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1"><div className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</div></main>
      </div>
    </div>
  );
}
