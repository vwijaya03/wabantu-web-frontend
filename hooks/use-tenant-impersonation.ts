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

let inFlightReadiness: AbortController | null = null;

function abortInFlightReadiness() {
  inFlightReadiness?.abort();
  inFlightReadiness = null;
}

function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (e instanceof Error && (e.name === "AbortError" || e.name === "CanceledError")) {
    return true;
  }
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "ERR_CANCELED"
  );
}

async function afterEnterTenant(
  qc: ReturnType<typeof useQueryClient>,
  completeSwitch: () => void,
) {
  resetTenantScopedQueries(qc);
  abortInFlightReadiness();
  inFlightReadiness = new AbortController();
  const status = await waitForTenantReadiness({
    signal: inFlightReadiness.signal,
  });
  inFlightReadiness = null;
  if (!status.ready) {
    toast.info(
      "Schema tenant masih disiapkan — beberapa data mungkin belum tampil.",
    );
  }
  completeSwitch();
}

async function afterLeaveTenant(
  qc: ReturnType<typeof useQueryClient>,
  completeSwitch: () => void,
) {
  abortInFlightReadiness();
  resetQueriesForPlatformConsole(qc);
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
        await afterEnterTenant(qc, completeSwitch);
      } catch (e) {
        if (isAbortError(e)) {
          return;
        }
        cancelSwitch();
        toast.error(toApiError(e).message);
        return;
      }
      toast.success("Memantau tenant — mode internal aktif");
      router.replace("/dashboard");
    },
    onError: (e) => {
      abortInFlightReadiness();
      cancelSwitch();
      toast.error(toApiError(e).message);
    },
  });

  const stopMut = useMutation({
    mutationFn: async () => {
      beginSwitch();
      abortInFlightReadiness();
      return adminApi.stopImpersonation();
    },
    onSuccess: async () => {
      await refresh();
      try {
        await afterLeaveTenant(qc, completeSwitch);
      } catch (e) {
        cancelSwitch();
        toast.error(toApiError(e).message);
        return;
      }
      toast.success("Kembali ke konsol platform");
      router.replace("/dashboard/admin");
    },
    onError: (e) => {
      abortInFlightReadiness();
      cancelSwitch();
      toast.error(toApiError(e).message);
    },
  });

  const isBusy = isSwitching || impersonateMut.isPending || stopMut.isPending;

  return { impersonateMut, stopMut, isBusy };
}
