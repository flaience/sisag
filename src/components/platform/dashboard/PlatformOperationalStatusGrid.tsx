import { SisagOperationalStatus } from "@/components/sisag";
import type { PlatformOperationalStatusItem } from "./types";

type PlatformOperationalStatusGridProps = {
  items: PlatformOperationalStatusItem[];
};

export function PlatformOperationalStatusGrid({
  items,
}: PlatformOperationalStatusGridProps) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {items.map((item) => (
        <SisagOperationalStatus
          key={item.id}
          title={item.title}
          status={item.status}
          description={item.description}
          icon={item.icon}
          tone={item.tone}
        />
      ))}
    </div>
  );
}
