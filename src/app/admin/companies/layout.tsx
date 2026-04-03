import { cookies } from "next/headers";
import { requireRole } from "@/lib/auth/requireRole";

export default async function AdminCompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value ?? "";

  await requireRole({
    accessToken,
    allowedRoles: ["owner"],
  });

  return <>{children}</>;
}
