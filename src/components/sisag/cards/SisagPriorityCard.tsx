import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type SisagPriorityTone = "critical" | "warning" | "info" | "success";

type SisagPriorityCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  tone?: SisagPriorityTone;
  href?: string;
  actionLabel?: string;
};

const toneClasses: Record<SisagPriorityTone, string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function SisagPriorityCard({
  title,
  description,
  icon,
  tone = "info",
  href,
  actionLabel = "Ver detalhes",
}: SisagPriorityCardProps) {
  const content = (
    <div
      className={`rounded-2xl border p-4 transition ${
        toneClasses[tone]
      } ${href ? "hover:shadow-sm" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>

          {href && (
            <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium">
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
