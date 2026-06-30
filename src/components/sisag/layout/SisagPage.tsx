import { ReactNode } from "react";

type SisagPageProps = {
  children: ReactNode;
};

export function SisagPage({ children }: SisagPageProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-6 p-4 sm:p-6">{children}</div>
    </div>
  );
}
