import type { ReactNode } from "react";
import { SisagEmptyState } from "./SisagEmptyState";

type SisagDataStateProps = {
  state: "loading" | "error" | "empty";
  title?: string;
  description?: string;
  action?: ReactNode;
};

const defaults = {
  loading: {
    title: "Carregando informações",
    description: "Aguarde enquanto os dados são preparados.",
  },
  error: {
    title: "Não foi possível carregar",
    description: "Tente novamente. Se o problema continuar, procure o suporte.",
  },
  empty: {
    title: "Nenhum registro encontrado",
    description: "Ajuste os filtros ou adicione o primeiro registro.",
  },
} as const;

export function SisagDataState({
  state,
  title = defaults[state].title,
  description = defaults[state].description,
  action,
}: SisagDataStateProps) {
  if (state === "loading") {
    return (
      <div className="flex min-h-40 items-center justify-center p-6" role="status" aria-live="polite">
        <div className="text-center">
          <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div role={state === "error" ? "alert" : "status"} aria-live="polite" className="p-4 sm:p-5">
      <SisagEmptyState title={title} description={description} action={action} />
    </div>
  );
}
