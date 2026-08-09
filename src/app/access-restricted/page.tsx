import Link from "next/link";

import type { CommercialAccessReason } from "@/modules/commercial/commercial-access.service";

const messages: Partial<Record<CommercialAccessReason, string>> = {
  commercial_client_prospect:
    "O cadastro comercial ainda não foi liberado para utilização.",
  commercial_client_suspended:
    "O cadastro comercial está temporariamente suspenso.",
  commercial_client_closed:
    "O cadastro comercial foi encerrado.",
  subscription_pending:
    "A assinatura está aguardando ativação.",
  subscription_past_due:
    "A assinatura possui uma pendência que precisa ser regularizada.",
  subscription_suspended:
    "A assinatura está temporariamente suspensa.",
  subscription_cancelled:
    "A assinatura foi cancelada.",
};

type AccessRestrictedPageProps = {
  searchParams: Promise<{ reason?: string | string[] }>;
};

export default async function AccessRestrictedPage({
  searchParams,
}: AccessRestrictedPageProps) {
  const params = await searchParams;
  const reason = Array.isArray(params.reason)
    ? params.reason[0]
    : params.reason;
  const message =
    (reason && messages[reason as CommercialAccessReason]) ??
    "O acesso comercial ao SISAG está temporariamente indisponível.";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center">
        <section className="w-full rounded-3xl border bg-white p-6 shadow-sm md:p-10">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
              ⚠️
            </div>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">
              Acesso comercial restrito
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
              {message}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
              Sua autenticação continua válida. Entre em contato com o suporte
              para verificar ou regularizar o acesso.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/api/auth/context"
                className="w-full rounded-xl bg-black px-4 py-2.5 text-center text-sm font-medium text-white transition hover:opacity-90 sm:w-auto"
              >
                Ver diagnóstico
              </Link>

              <Link
                href="/login"
                className="w-full rounded-xl border px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Voltar ao login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
