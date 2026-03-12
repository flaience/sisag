"use client";

import React from "react";
import { LogOut, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuthContext } from "@/contexts/AuthContext";

export default function AdminUserMenu() {
  const router = useRouter();
  const { loading, user, refresh } = useAuthContext();
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      await refresh();

      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex">
        <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
        <div className="space-y-1">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <User2 className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {user?.name ?? "Usuário"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {user?.email ?? "Sem e-mail"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
        <span>{loggingOut ? "Saindo..." : "Sair"}</span>
      </button>
    </div>
  );
}
