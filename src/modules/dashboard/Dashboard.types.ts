export type DashboardAppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "COMPLETED"
  | string;

export type DashboardUpcomingItem = {
  id: string;
  clientName: string | null;
  serviceName: string | null;
  startTime: string | null;
  status: string;
  professionalName?: string | null;
};

export type AdminDashboardData = {
  today: {
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    completed: number;
    rescheduled: number;
  };
  upcoming: DashboardUpcomingItem[];
  messaging: {
    sentToday: number;
    deliveredToday: number;
    readToday: number;
    failedToday: number;
    lastMessageAt: string | null;
  };
  automations: {
    pending: number;
    completedToday: number;
    failed: number;
    nextRunAt: string | null;
  };
  health: {
    agendaHealthy: boolean;
    messagingHealthy: boolean;
    automationsHealthy: boolean;
  };
};
