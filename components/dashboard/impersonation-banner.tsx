"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { useTenantImpersonation } from "@/hooks/use-tenant-impersonation";

export function ImpersonationBanner() {
  const { user } = useAuth();
  const { stopMut, isBusy } = useTenantImpersonation();
  const active = user?.impersonation?.active && user.tenant;

  if (!active) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Mode internal — memantau tenant{" "}
          <strong>{user.tenant?.name}</strong>
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1 border-amber-300 bg-white/80 hover:bg-white"
        disabled={isBusy}
        onClick={() => stopMut.mutate()}
      >
        <X className="h-3.5 w-3.5" />
        Keluar
      </Button>
    </div>
  );
}
