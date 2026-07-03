import { ReactNode } from "react";

export type PlatformTone =
  | "neutral"
  | "success"
  | "warning"
  | "critical"
  | "info"
  | "automation";

export type PlatformMetricItem = {
  id: string;
  title: string;
  value: string | number;
  description?: string;
  tone?: PlatformTone;
  icon?: ReactNode;
};

export type PlatformPriorityItem = {
  id: string;
  title: string;
  description: string;
  tone?: PlatformTone;
  icon?: ReactNode;
  href?: string;
  actionLabel?: string;
};

export type PlatformOperationalStatusItem = {
  id: string;
  title: string;
  status: string;
  description: string;
  tone?: "stable" | "attention" | "critical";
  icon?: ReactNode;
};

export type PlatformTimelineItem = {
  id: string;
  title: ReactNode;
  description?: string | null;
  meta?: string | null;
  sortDate?: string | null;
  icon?: ReactNode;
};

export type PlatformDashboardConfig = {
  metrics?: PlatformMetricItem[];
  priorities?: PlatformPriorityItem[];
  operationalStatus?: PlatformOperationalStatusItem[];
  timeline?: PlatformTimelineItem[];
};
