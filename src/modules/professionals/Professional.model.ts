/*src/modules/professionals/Professional.model.ts*/

export type Professional = {
  id: string;
  companyId: string | null;
  name: string;
  specialty: string | null;
  photoUrl: string | null;
  status: "ACTIVE" | "INACTIVE";
  avgDuration: number;
  createdAt: Date;
};
