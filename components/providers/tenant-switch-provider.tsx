"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { isTenantScopedQuery } from "@/lib/query/platform-console";
import { toast } from "sonner";

const SWITCH_TIMEOUT_MS = 30_000;

type TenantSwitchContextValue = {
  isSwitching: boolean;
  beginSwitch: () => void;
  completeSwitch: () => void;
  cancelSwitch: () => void;
};

const TenantSwitchContext = createContext<TenantSwitchContextValue | null>(null);

export function TenantSwitchProvider({ children }: { children: ReactNode }) {
  const [isSwitching, setIsSwitching] = useState(false);
  const [awaitingData, setAwaitingData] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qc = useQueryClient();

  const tenantFetching = useIsFetching({
    predicate: (q) => isTenantScopedQuery(q.queryKey),
  });

  const clearSwitchTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const endSwitch = useCallback(() => {
    clearSwitchTimeout();
    setIsSwitching(false);
    setAwaitingData(false);
  }, [clearSwitchTimeout]);

  const beginSwitch = useCallback(() => {
    clearSwitchTimeout();
    qc.cancelQueries({
      predicate: (q) => isTenantScopedQuery(q.queryKey),
    });
    setAwaitingData(false);
    setIsSwitching(true);
    timeoutRef.current = setTimeout(() => {
      endSwitch();
      toast.info(
        "Data tenant masih dimuat di latar — muat ulang jika tampilan belum sesuai.",
      );
    }, SWITCH_TIMEOUT_MS);
  }, [clearSwitchTimeout, endSwitch, qc]);

  const completeSwitch = useCallback(() => {
    setAwaitingData(true);
  }, []);

  const cancelSwitch = useCallback(() => {
    endSwitch();
  }, [endSwitch]);

  useEffect(() => {
    if (!isSwitching || !awaitingData || tenantFetching > 0) return;

    const settleTimer = setTimeout(() => {
      endSwitch();
    }, 150);

    return () => clearTimeout(settleTimer);
  }, [awaitingData, endSwitch, isSwitching, tenantFetching]);

  useEffect(() => () => clearSwitchTimeout(), [clearSwitchTimeout]);

  return (
    <TenantSwitchContext.Provider
      value={{ isSwitching, beginSwitch, completeSwitch, cancelSwitch }}
    >
      {children}
    </TenantSwitchContext.Provider>
  );
}

export function useTenantSwitch(): TenantSwitchContextValue {
  const ctx = useContext(TenantSwitchContext);
  if (!ctx) {
    throw new Error("useTenantSwitch must be used inside TenantSwitchProvider");
  }
  return ctx;
}

export function TenantSwitchOverlay() {
  const { isSwitching } = useTenantSwitch();
  if (!isSwitching) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-[1px]"
      aria-busy
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Mengganti tenant…</p>
    </div>
  );
}
