export default function PlatformPostActivationLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando monitoramento pós-ativação">
      <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="h-20 animate-pulse border-b border-slate-200 bg-slate-100" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="grid gap-4 border-b border-slate-100 p-5 md:grid-cols-3">
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
