export type Company = {
  id: string;
  tenantId: string | null;
  name: string;
  document: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date;
};
