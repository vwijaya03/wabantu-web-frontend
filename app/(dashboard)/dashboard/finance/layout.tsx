"use client";

import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <RequireTenantDashboard title="Finance">{children}</RequireTenantDashboard>;
}
