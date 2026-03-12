"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
};

type AuthProfile = {
  id: string;
  tenantId: string | null;
  companyId: string | null;
  role: string | null;
  name: string | null;
};

type AuthCompany = {
  id: string;
  tenantId: string | null;
  name: string;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  businessType: string | null;
};

type AuthContextValue = {
  loading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  profile: AuthProfile | null;
  company: AuthCompany | null;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [company, setCompany] = useState<AuthCompany | null>(null);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/auth/context", {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setUser(null);
        setProfile(null);
        setCompany(null);
        return;
      }

      setUser(data.user ?? null);
      setProfile(data.profile ?? null);
      setCompany(data.company ?? null);
    } catch {
      setUser(null);
      setProfile(null);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      isAuthenticated: !!user,
      user,
      profile,
      company,
      refresh: load,
    }),
    [loading, user, profile, company],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext deve ser usado dentro de AuthProvider.");
  }

  return context;
}
