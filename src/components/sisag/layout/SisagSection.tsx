import { ReactNode } from "react";

type SisagSectionProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export function SisagSection({
  title,
  description,
  children,
}: SisagSectionProps) {
  return (
    <section className="space-y-4">
      {(title || description) && (
        <div>
          {title && (
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              {title}
            </h2>
          )}

          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
      )}

      {children}
    </section>
  );
}
