export type PlatformCompanySummary = {
  id: string;
  name: string;
};

export type PlatformProfessionalSummary = {
  id: string;
  companyId: string;
  resourceId: string | null;
  name: string;
};

export type PlatformContextSnapshot = {
  generatedAt: string;
  companies: PlatformCompanySummary[];
  professionals: PlatformProfessionalSummary[];
  professionalSchedules: PlatformProfessionalScheduleSummary[];
};

export type PlatformProfessionalScheduleSummary = {
  professionalId: string;
  resourceId: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
};
