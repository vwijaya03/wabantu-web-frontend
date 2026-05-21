"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  isRateLimitError,
  notifyRateLimitOnce,
  RATE_LIMIT_USER_MESSAGE,
  rateLimitTitle,
} from "@/lib/api/rate-limit";
import { toApiError } from "@/lib/api/errors";

/**
 * Subscribes to React Query failures and shows a dismissible banner when any
 * dashboard query hits HTTP 429 (global middleware rate limit).
 */
export function DashboardRateLimitNotice() {
  const qc = useQueryClient();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsub = qc.getQueryCache().subscribe((event) => {
      const query = event?.query;
      if (!query || event.type !== "updated") return;
      if (query.state.status !== "error") return;
      const err = query.state.error;
      if (!isRateLimitError(err)) return;
      setVisible(true);
      notifyRateLimitOnce(toApiError(err).message);
    });
    return unsub;
  }, [qc]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-amber-950 dark:text-amber-50">
          {rateLimitTitle()}
        </p>
        <p className="mt-1 text-muted-foreground">{RATE_LIMIT_USER_MESSAGE}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setVisible(false);
            void qc.refetchQueries({ type: "active" });
          }}
        >
          Coba lagi
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="Tutup pemberitahuan"
          onClick={() => setVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
