import { SisagMetricCard } from "@/components/sisag";
import type { PlatformMetricItem } from "./types";

type PlatformMetricGridProps = {
  items: PlatformMetricItem[];
};

function normalizeMetricTone(tone: PlatformMetricItem["tone"]) {
  if (tone === "automation") return "info";
  return tone;
}

export function PlatformMetricGrid({ items }: PlatformMetricGridProps) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <SisagMetricCard
          key={item.id}
          title={item.title}
          value={item.value}
          description={item.description}
          icon={item.icon}
          tone={normalizeMetricTone(item.tone)}
        />
      ))}
    </div>
  );
}
