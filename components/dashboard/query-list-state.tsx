"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatQueryError } from "@/lib/api/rate-limit";

type QueryListStateProps = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty: boolean;
  empty: ReactNode;
  loadingLabel?: string;
  onRetry?: () => void;
  children: ReactNode;
};

/**
 * Standard list/card body: loading → error (incl. 429) → empty → children.
 * Avoids showing "Memuat..." forever or empty-state when the request failed.
 */
export function QueryListState({
  isLoading,
  isError,
  error,
  isEmpty,
  empty,
  loadingLabel = "Memuat...",
  onRetry,
  children,
}: QueryListStateProps) {
  if (isError) {
    const { title, detail } = formatQueryError(error);
    return (
      <div className="space-y-3 py-8 text-center">
        <p className="text-sm font-medium text-destructive">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Coba lagi
          </Button>
        ) : null}
      </div>
    );
  }

  if (isLoading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {loadingLabel}
      </p>
    );
  }

  if (isEmpty) return <>{empty}</>;

  return <>{children}</>;
}
