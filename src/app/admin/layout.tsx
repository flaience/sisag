"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminPageHeader from "@/components/AdminPageHeader";
import AdminUserMenu from "@/components/AdminUserMenu";
import AdminCompanyInfo from "@/components/AdminCompanyInfo";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <AdminSidebar />

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={closeMobileMenu}
            />
            <div className="absolute inset-y-0 left-0 w-[88%] max-w-xs bg-white shadow-xl">
              <AdminSidebar mobile onNavigate={closeMobileMenu} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 md:hidden"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div>
                  <p className="text-base font-semibold text-slate-900 md:text-lg">
                    SISAG Admin
                  </p>
                  <p className="text-xs text-slate-500 md:text-sm">
                    Gestão clínica e agendamentos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <AdminCompanyInfo />
                <AdminUserMenu />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
              <AdminPageHeader />
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
