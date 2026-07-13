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
};
