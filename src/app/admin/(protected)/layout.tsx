import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/shell";
import { ADMIN_COOKIE, isValidSessionValue } from "@/lib/auth/session";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  if (!isValidSessionValue(store.get(ADMIN_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
