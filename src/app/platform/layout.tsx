import Link from "next/link";

import { requirePlatformOperator } from "@/lib/auth/requirePlatformOperator";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const operator = await requirePlatformOperator(session?.access_token ?? "");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">SISAG</p>
            <h1 className="mt-1 text-lg font-semibold">Operações da plataforma</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{operator.name ?? operator.email ?? "Operador"}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">{operator.role}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-81px)] w-full max-w-[1600px] md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-white p-4">
          <nav aria-label="Navegação da plataforma">
            <Link
              href="/platform/commercial/post-activation"
              className="block rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white"
            >
              Pós-ativação
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
