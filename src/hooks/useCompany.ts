"use client";

import { useAuthContext } from "@/contexts/AuthContext";

export function useCompany() {
  const { company } = useAuthContext();
  return company;
}
