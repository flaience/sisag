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

export type DashboardRecentMessage = {
  id: string;
  provider: string;
  status: string;
  toPhone: string;
  body: string;
  createdAt: string | null;
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

  week: {
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    completed: number;
    rescheduled: number;
  };

  upcoming: DashboardUpcomingItem[];

  messaging: {
    receivedToday: number;
    sentToday: number;
    deliveredToday: number;
    readToday: number;
    failedToday: number;
    lastMessageAt: string | null;
    recent: DashboardRecentMessage[];
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
