import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center">
        <section className="w-full rounded-3xl border bg-white p-6 shadow-sm md:p-10">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
              🔒
            </div>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">
              Acesso não autorizado
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
              Você está autenticado, mas não tem permissão para acessar esta
              área do SISAG.
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
              Se você acredita que deveria ter acesso, fale com o administrador
              da sua empresa.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/admin"
                className="w-full rounded-xl bg-black px-4 py-2.5 text-center text-sm font-medium text-white transition hover:opacity-90 sm:w-auto"
              >
                Voltar ao painel
              </Link>

              <Link
                href="/login"
                className="w-full rounded-xl border px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Ir para login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
