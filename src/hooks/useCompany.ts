"use client";

import { useEffect, useState } from "react";

export function useCompany() {
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/v1/companies?current=1");
      const data = await res.json();
      setCompany(data);
    }

    load();
  }, []);

  return company;
}
