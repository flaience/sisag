// src/app/admin/layout.tsx
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar sempre do lado esquerdo */}
      <AdminSidebar />

      {/* Conteúdo principal */}
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
