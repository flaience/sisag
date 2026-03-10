import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex h-16 items-center justify-between px-4 md:px-6">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  SISAG Admin
                </h1>
                <p className="text-sm text-slate-500">
                  Gestão clínica e agendamentos
                </p>
              </div>

              <div className="text-sm text-slate-500">SegSerra</div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
