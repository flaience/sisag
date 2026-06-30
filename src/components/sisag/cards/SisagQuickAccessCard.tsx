import Link from "next/link";
import { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

type SisagQuickAccessCardProps = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  eyebrow?: string;
};

export function SisagQuickAccessCard({
  title,
  description,
  href,
  icon,
  eyebrow,
}: SisagQuickAccessCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
          {icon}
        </div>

        <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-900" />
      </div>

      <div className="mt-5">
        {eyebrow && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            {eyebrow}
          </p>
        )}

        <h3 className="text-base font-semibold text-slate-900">{title}</h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </Link>
  );
}
