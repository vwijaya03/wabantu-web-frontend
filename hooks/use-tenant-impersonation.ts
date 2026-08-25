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
import { toast } from "sonner";

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
      resetTenantScopedQueries(qc);
      completeSwitch();
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
      resetQueriesForPlatformConsole(qc);
      completeSwitch();
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
