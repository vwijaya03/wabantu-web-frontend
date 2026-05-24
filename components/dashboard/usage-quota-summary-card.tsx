"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usageApi } from "@/lib/api/usage";
import {
  formatQuotaLimit,
  formatQuotaUsed,
  getQuotaMeta,
  quotaPercentUsed,
  quotaStatus,
} from "@/lib/usage-quota-labels";
import { cn } from "@/lib/utils";

const HIGHLIGHT_TYPES = ["ai_token", "ai_conversation"] as const;

export function UsageQuotaSummaryCard() {
  const { data: usage, isLoading } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: () => usageApi.summary(),
  });

  const highlights = HIGHLIGHT_TYPES.map((eventType) => {
    const item = usage?.quotas.find((q) => q.eventType === eventType);
    if (!item || item.limit <= 0) return null;
    const meta = getQuotaMeta(eventType);
    const status = quotaStatus(item);
    const pct = quotaPercentUsed(item);
    return (
      <div key={eventType}>
        <div className="flex justify-between text-sm">
          <span className="font-medium">{meta.label}</span>
          <span
            className={cn(
              "tabular-nums text-muted-foreground",
              status === "exhausted" && "font-medium text-destructive",
            )}
          >
            {formatQuotaUsed(item, meta)} / {formatQuotaLimit(item, meta)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full",
              status === "exhausted" && "bg-destructive",
              status === "warn" && "bg-amber-500",
              status === "ok" && "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }).filter(Boolean);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Kuota bulan ini</CardTitle>
          <CardDescription>
            {usage?.period ?? "—"} · paket {usage?.plan ?? "—"}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" asChild>
          <Link href="/dashboard/billing">
            Detail
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : highlights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Buka Billing untuk detail kuota.</p>
        ) : (
          highlights
        )}
        <p className="text-xs text-muted-foreground">
          Tagihan template WhatsApp ke Meta terpisah dari kuota di atas.
        </p>
      </CardContent>
    </Card>
  );
}
