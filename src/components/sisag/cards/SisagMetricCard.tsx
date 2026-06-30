import { ReactNode } from "react";

type SisagMetricTone = "neutral" | "success" | "warning" | "critical" | "info";

type SisagMetricCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  tone?: SisagMetricTone;
};

const toneClasses: Record<SisagMetricTone, string> = {
  neutral: "border-slate-200 bg-white text-slate-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

export function SisagMetricCard({
  title,
  value,
  description,
  icon,
  tone = "neutral",
}: SisagMetricCardProps) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm opacity-75">{title}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>

        {icon && <div className="opacity-70">{icon}</div>}
      </div>

      {description && (
        <p className="mt-2 text-sm leading-5 opacity-75">{description}</p>
      )}
    </div>
  );
}
