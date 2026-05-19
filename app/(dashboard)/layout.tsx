import { DashboardAuthShell } from "@/components/dashboard/dashboard-auth-shell";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardAuthShell>{children}</DashboardAuthShell>;
}
