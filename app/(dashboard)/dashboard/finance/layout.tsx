"use client";

import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { useLocale } from "@/lib/i18n/locale";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  return <RequireTenantDashboard title={t("Finance")}>{children}</RequireTenantDashboard>;
}
