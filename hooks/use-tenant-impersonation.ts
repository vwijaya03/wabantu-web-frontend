"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useTenantSwitch } from "@/components/providers/tenant-switch-provider";
import { adminApi } from "@/lib/api/admin";
import { toApiError } from "@/lib/api/client";
import {
  resetQueriesForPlatformConsole,
  resetTenantScopedQueries,
} from "@/lib/query/platform-console";
import { waitForTenantReadiness } from "@/lib/tenant/wait-for-tenant-readiness";
import { toast } from "sonner";

async function afterTenantSessionRefresh(
  qc: ReturnType<typeof useQueryClient>,
  reset: (qc: ReturnType<typeof useQueryClient>) => void,
  completeSwitch: () => void,
) {
  reset(qc);
  const status = await waitForTenantReadiness();
  if (!status.ready) {
    toast.info(
      "Schema tenant masih disiapkan — beberapa data mungkin belum tampil.",
    );
  }
  completeSwitch();
}

export function useTenantImpersonation() {
  const { refresh } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const { beginSwitch, completeSwitch, cancelSwitch, isSwitching } =
    useTenantSwitch();

  const impersonateMut = useMutation({
    mutationFn: async (tenantId: string) => {
      beginSwitch();
      return adminApi.impersonate(tenantId);
    },
    onSuccess: async () => {
      await refresh();
      try {
        await afterTenantSessionRefresh(
          qc,
          resetTenantScopedQueries,
          completeSwitch,
        );
      } catch (e) {
        cancelSwitch();
        toast.error(toApiError(e).message);
        return;
      }
      toast.success("Memantau tenant — mode internal aktif");
      router.replace("/dashboard");
    },
    onError: (e) => {
      cancelSwitch();
      toast.error(toApiError(e).message);
    },
  });

  const stopMut = useMutation({
    mutationFn: async () => {
      beginSwitch();
      return adminApi.stopImpersonation();
    },
    onSuccess: async () => {
      await refresh();
      try {
        await afterTenantSessionRefresh(
          qc,
          resetQueriesForPlatformConsole,
          completeSwitch,
        );
      } catch (e) {
        cancelSwitch();
        toast.error(toApiError(e).message);
        return;
      }
      toast.success("Kembali ke konsol platform");
      router.replace("/dashboard/admin");
    },
    onError: (e) => {
      cancelSwitch();
      toast.error(toApiError(e).message);
    },
  });

  const isBusy = isSwitching || impersonateMut.isPending || stopMut.isPending;

  return { impersonateMut, stopMut, isBusy };
}
