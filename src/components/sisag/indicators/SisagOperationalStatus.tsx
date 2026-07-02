import { ReactNode } from "react";

type SisagOperationalStatusTone = "stable" | "attention" | "critical";

type SisagOperationalStatusProps = {
  title: string;
  status: string;
  description: string;
  icon?: ReactNode;
  tone?: SisagOperationalStatusTone;
};

const toneClasses: Record<SisagOperationalStatusTone, string> = {
  stable: "border-emerald-200 bg-emerald-50 text-emerald-900",
  attention: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-200 bg-rose-50 text-rose-900",
};

export function SisagOperationalStatus({
  title,
  status,
  description,
  icon,
  tone = "stable",
}: SisagOperationalStatusProps) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 opacity-80">{icon}</div>}

        <div>
          <p className="text-sm opacity-75">{title}</p>
          <p className="mt-2 text-lg font-semibold">{status}</p>
          <p className="mt-2 text-sm leading-6 opacity-75">{description}</p>
        </div>
      </div>
    </div>
  );
}
