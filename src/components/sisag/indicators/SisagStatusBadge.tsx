type SisagStatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "critical"
  | "info"
  | "automation";

type SisagStatusBadgeProps = {
  label: string;
  tone?: SisagStatusTone;
};

const toneClasses: Record<SisagStatusTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  automation: "border-violet-200 bg-violet-50 text-violet-700",
};

export function SisagStatusBadge({
  label,
  tone = "neutral",
}: SisagStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
