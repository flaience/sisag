export type AgendaStatusFilter =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "RESCHEDULED";

export type AgendaProfessionalSummary = {
  professionalId: string;
  professionalName: string;
  totalAppointments: number;
  confirmed: number;
  pending: number;
};

export type AgendaProfessionalColumn = {
  professionalId: string;
  professionalName: string;
  appointments: AgendaAppointmentItem[];
  totalAppointments: number;
  confirmed: number;
  pending: number;
};

export type AgendaDayStats = {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  completed: number;
  professionalsOnDay: number;
};

export type AgendaFilterOptions = {
  dateIso: string;
  professionalId?: string;
  status?: AgendaStatusFilter;
};

export type AgendaFilterProfessionalOption = {
  id: string;
  name: string;
};

export type AgendaDayData = {
  dateIso: string;
  stats: AgendaDayStats;
  appointments: AgendaAppointmentItem[];
  professionals: AgendaProfessionalSummary[];
  board: AgendaProfessionalColumn[];
  availableProfessionals: AgendaFilterProfessionalOption[];
  appliedFilters: {
    professionalId: string | null;
    status: AgendaStatusFilter;
  };
};
export type AgendaTimeSlot = {
  label: string;
  hour: number;
  minute: number;
  minutesOfDay: number;
};

export type AgendaTimePositionedAppointment = AgendaAppointmentItem & {
  minutesOfDay: number;
  top: number;
  height: number;
  hasConflict: boolean;
};

export type AgendaProfessionalTimeColumn = {
  professionalId: string;
  professionalName: string;
  appointments: AgendaTimePositionedAppointment[];
  totalAppointments: number;
  confirmed: number;
  pending: number;
};

export type AgendaAppointmentItem = {
  id: string;
  scheduledTime: string;
  endTime: string;
  timeLabel: string;
  status: string;
  clientName: string;
  professionalId: string | null;
  professionalName: string | null;
  durationMinutes: number;
  serviceNameSnapshot: string | null;
  hasConflict?: boolean;
};
