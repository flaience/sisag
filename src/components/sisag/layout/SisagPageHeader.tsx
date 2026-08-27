import type { ReactNode } from "react";

type SisagPageHeaderProps = {
  title: string;
  description?: string;
  context?: ReactNode;
  actions?: ReactNode;
};

export function SisagPageHeader({
  title,
  description,
  context,
  actions,
}: SisagPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-2">
        {context && (
          <div className="text-sm font-medium text-slate-500">{context}</div>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
