"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usageApi, type QuotaItem } from "@/lib/api/usage";
import {
  formatQuotaLimit,
  formatQuotaUsed,
  getQuotaMeta,
  quotaPercentUsed,
  quotaStatus,
  QUOTA_DISPLAY_ORDER,
} from "@/lib/usage-quota-labels";
import { cn } from "@/lib/utils";

function QuotaRow({ item }: { item: QuotaItem }) {
  const meta = getQuotaMeta(item.eventType);
  const status = quotaStatus(item);
  const pct = quotaPercentUsed(item);

  if (meta.hideWhenZeroLimit && item.limit === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{meta.label}</p>
        <p
          className={cn(
            "text-sm tabular-nums",
            status === "exhausted" && "font-semibold text-destructive",
            status === "warn" && "text-amber-700 dark:text-amber-400",
          )}
        >
          {formatQuotaUsed(item, meta)} / {formatQuotaLimit(item, meta)}
        </p>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
      {item.limit > 0 ? (
        <>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                status === "exhausted" && "bg-destructive",
                status === "warn" && "bg-amber-500",
                status === "ok" && "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {pct}% terpakai
            {item.remaining > 0
              ? ` · sisa ${formatQuotaUsed({ ...item, used: item.remaining }, meta)}`
              : " · kuota habis"}
          </p>
        </>
      ) : null}
    </div>
  );
}

type UsageQuotaPanelProps = {
  showMetaWhatsAppNote?: boolean;
  className?: string;
};

export function UsageQuotaPanel({ showMetaWhatsAppNote = true, className }: UsageQuotaPanelProps) {
  const { data: usage, isLoading, isError } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: () => usageApi.summary(),
  });

  const planLabel =
    usage?.plan === "trial"
      ? "Trial — semua fitur aktif, kuota ketat"
      : usage?.plan
        ? `Paket ${usage.plan}`
        : "—";

  const ordered =
    usage?.quotas
      .slice()
      .sort(
        (a, b) =>
          QUOTA_DISPLAY_ORDER.indexOf(a.eventType as (typeof QUOTA_DISPLAY_ORDER)[number]) -
          QUOTA_DISPLAY_ORDER.indexOf(b.eventType as (typeof QUOTA_DISPLAY_ORDER)[number]),
      ) ?? [];

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Kuota paket WABantu</CardTitle>
          <CardDescription>
            Periode {usage?.period ?? "—"} · {planLabel}. Reset tiap awal bulan kalender.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat kuota…</p>
          ) : isError || !usage ? (
            <p className="text-sm text-muted-foreground">Kuota tidak dapat dimuat.</p>
          ) : ordered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pemakaian tercatat bulan ini.</p>
          ) : (
            ordered.map((q) => <QuotaRow key={q.eventType} item={q} />)
          )}
        </CardContent>
      </Card>

      {showMetaWhatsAppNote ? (
        <Card className="border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/30">
          <CardHeader>
            <CardTitle className="text-base">WhatsApp & Meta (terpisah dari kuota di atas)</CardTitle>
            <CardDescription>
              Ini aturan WhatsApp resmi — bukan angka yang kami kurangi di dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                <strong className="text-foreground">Gratis di Meta:</strong> pelanggan chat dulu → Anda
                balas teks dari inbox dalam 24 jam (staff, handoff, atau AI).
              </li>
              <li>
                <strong className="text-foreground">Bayar ke Meta (kartu di Business Manager Anda):</strong>{" "}
                promosi / template di luar jendela 24 jam (~Rp 400–450/pesan marketing ke Indonesia).
              </li>
              <li>
                <strong className="text-foreground">Bukan termasuk langganan WABantu:</strong> tagihan
                template WhatsApp tidak muncul di panel kuota ini.
              </li>
            </ul>
            <p className="text-xs">
              <Link
                href="/dashboard/billing"
                className="text-primary underline-offset-4 hover:underline"
              >
                Billing
              </Link>
              {" · "}
              <a
                href="https://developers.facebook.com/docs/whatsapp/pricing/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Tarif resmi Meta
              </a>
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
