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
import { useLocale } from "@/lib/i18n/locale";
import {
  formatQuotaLimit,
  formatQuotaUsed,
  getQuotaMeta,
  quotaPercentUsed,
  quotaStatus,
} from "@/lib/usage-quota-labels";
import { cn } from "@/lib/utils";

const HIGHLIGHT_TYPES = ["ai_token", "ai_conversation"] as const;

function localizeQuotaFigure(
  raw: string,
  locale: "id" | "en",
  t: (source: string) => string,
) {
  if (raw === "Tidak termasuk paket") return t("Tidak termasuk paket");
  if (locale === "en") return raw.replace(/ jt$/, "M");
  return raw;
}

export function UsageQuotaSummaryCard() {
  const { t, locale } = useLocale();
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
          <span className="font-medium">{t(meta.label)}</span>
          <span
            className={cn(
              "tabular-nums text-muted-foreground",
              status === "exhausted" && "font-medium text-destructive",
            )}
          >
            {localizeQuotaFigure(formatQuotaUsed(item, meta), locale, t)} /{" "}
            {localizeQuotaFigure(formatQuotaLimit(item, meta), locale, t)}
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
          <CardTitle className="text-base">{t("Kuota bulan ini")}</CardTitle>
          <CardDescription>
            {t("{period} · paket {plan}", {
              period: usage?.period ?? "—",
              plan: usage?.plan ?? "—",
            })}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" asChild>
          <Link href="/dashboard/billing">
            {t("Detail")}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("Memuat…")}</p>
        ) : highlights.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Buka Billing untuk detail kuota.")}</p>
        ) : (
          highlights
        )}
        <p className="text-xs text-muted-foreground">
          {t("Tagihan template WhatsApp ke Meta terpisah dari kuota di atas.")}
        </p>
      </CardContent>
    </Card>
  );
}
