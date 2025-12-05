export type Appointment = {
  id: string;
  companyId: string | null;
  professionalId: string | null;
  clientId: string | null;

  scheduledTime: Date;
  confirmedAt: Date | null;

  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "NO_SHOW";

  createdAt: Date;
};
