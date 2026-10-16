"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { ADMIN_LOGIN_PATH } from "@/lib/api/admin-client";
import { useLocale } from "@/lib/i18n/locale";

/** Gate halaman superadmin: butuh sesi platform admin yang valid (bukan role sesi client). */
export function AdminSessionRequired() {
  const { t } = useLocale();
  const pathname = usePathname();
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <ShieldAlert className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{t("Halaman ini butuh sesi Platform Admin.")}</p>
      <Button asChild size="sm">
        <Link href={`${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(pathname)}`}>{t("Login Platform Admin")}</Link>
      </Button>
    </div>
  );
}

export function AdminLogoutButton() {
  const { t } = useLocale();
  const { isAdmin, logoutAdmin } = useAdminSession();
  if (!isAdmin) return null;
  return (
    <Button variant="outline" size="sm" onClick={logoutAdmin} title={t("Keluar dari sesi Platform Admin saja")}>
      Keluar admin
    </Button>
  );
}
