import { SisagPriorityCard } from "@/components/sisag";
import type { PlatformPriorityItem } from "./types";

type PlatformPriorityGridProps = {
  items: PlatformPriorityItem[];
};

function normalizePriorityTone(tone: PlatformPriorityItem["tone"]) {
  if (tone === "critical") return "critical";
  if (tone === "warning") return "warning";
  if (tone === "success") return "success";

  return "info";
}

export function PlatformPriorityGrid({ items }: PlatformPriorityGridProps) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {items.map((item) => (
        <SisagPriorityCard
          key={item.id}
          title={item.title}
          description={item.description}
          icon={item.icon}
          tone={normalizePriorityTone(item.tone)}
          href={item.href}
          actionLabel={item.actionLabel}
        />
      ))}
    </div>
  );
}
