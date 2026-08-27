import type { ReactNode } from "react";

type SisagListFrameProps = {
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function SisagListFrame({
  title,
  description,
  toolbar,
  children,
  footer,
}: SisagListFrameProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {(title || description || toolbar) && (
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
          {(title || description) && (
            <div className="min-w-0">
              {title && <h2 className="font-semibold text-slate-950">{title}</h2>}
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}
      <div>{children}</div>
      {footer && <div className="border-t border-slate-100 p-4 sm:px-5">{footer}</div>}
    </section>
  );
}
