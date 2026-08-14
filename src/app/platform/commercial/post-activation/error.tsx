"use client";

import { useEffect } from "react";

export default function PlatformPostActivationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("PLATFORM POST-ACTIVATION RENDER ERROR:", error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
      <h2 className="font-semibold text-rose-900">Não foi possível exibir o painel</h2>
      <p className="mt-2 text-sm text-rose-700">Tente carregar novamente. Se o problema continuar, consulte os logs da plataforma.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-xl bg-rose-900 px-4 py-2 text-sm font-medium text-white"
      >
        Tentar novamente
      </button>
    </div>
  );
}
