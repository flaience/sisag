export type Person = {
  id: string;
  companyId: string | null;
  name: string;
  phone: string | null;
  birthDate: string | null;
  email: string | null;
  notes: string | null;
  createdAt: Date;
};
