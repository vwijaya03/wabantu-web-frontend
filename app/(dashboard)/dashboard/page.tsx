"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Inbox,
  MessageSquare,
  Plug,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { UsageQuotaSummaryCard } from "@/components/dashboard/usage-quota-summary-card";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { hasTenantDashboardAccess } from "@/lib/api/auth";
import { analyticsApi } from "@/lib/api/analytics";
import { businessApi } from "@/lib/api/business";
import { knowledgeBaseApi } from "@/lib/api/knowledge-base";
import { whatsappApi } from "@/lib/api/whatsapp";
import { isBusinessProfileCardComplete } from "@/lib/business-profile-card-complete";
import {
  formatAvgFirstResponse,
  formatOpenRateCard,
} from "@/lib/format/analytics-overview";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";
import { useLocale } from "@/lib/i18n/locale";

export default function DashboardOverviewPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const tenantKey = useTenantKey();
  const router = useRouter();
  const tenantDashboardAccess = hasTenantDashboardAccess(user);
  const tenantReady = useTenantQueryEnabled();

  useEffect(() => {
    if (user && !tenantDashboardAccess) {
      router.replace("/dashboard/admin");
    }
  }, [user, tenantDashboardAccess, router]);

  const { data: channels = [] } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "whatsapp-channels"),
    queryFn: () => whatsappApi.list(),
    enabled: tenantReady,
  });
  const { data: analytics } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "analytics-overview", 30),
    queryFn: () => analyticsApi.overview(30),
    enabled: tenantReady,
  });
  const { data: businessProfile } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "business-profile"),
    queryFn: ({ signal }) => businessApi.get(signal),
    enabled: tenantReady,
  });
  const { data: kbList } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "knowledge-base-total"),
    queryFn: () => knowledgeBaseApi.list({ page: 1, pageSize: 1 }),
    enabled: tenantReady,
  });

  const kbTotal = kbList?.total ?? 0;
  const hasConnectedWhatsapp = channels.some((c) => c.status === "connected");
  const profileDone = isBusinessProfileCardComplete(businessProfile ?? null);
  const kbDone = kbTotal >= 5;
  const aiReady = profileDone && kbDone;

  const setupSteps = useMemo(
    () => [
      {
        key: "register",
        label: t("Buat akun bisnis"),
        done: true,
        href: "#",
      },
      {
        key: "wa",
        label: t("Sambungkan WhatsApp"),
        done: hasConnectedWhatsapp,
        href: "/dashboard/whatsapp/onboarding",
      },
      {
        key: "profile",
        label: t("Lengkapi info bisnis"),
        done: profileDone,
        href: "/dashboard/ai-settings",
      },
      {
        key: "kb",
        label: t("Isi minimal 5 FAQ"),
        done: kbDone,
        href: "/dashboard/knowledge-base/setup",
      },
    ],
    [t, hasConnectedWhatsapp, profileDone, kbDone],
  );

  const windowDays = analytics?.windowDays ?? 30;
  const todayIn = analytics?.today?.inbound ?? 0;
  const todayAi = analytics?.today?.aiReplies ?? 0;
  const todayAiPct = analytics?.today?.aiCoveragePct ?? 0;
  const reportingTz = analytics?.reportingTimezone ?? "Asia/Jakarta";
  const openFmt = formatOpenRateCard(
    analytics?.overview?.openRatePct ?? null,
    windowDays,
  );
  const avgFmt = formatAvgFirstResponse(
    analytics?.overview?.avgFirstResponseSec ?? null,
  );

  const stats = useMemo(
    () => [
      {
        label: t("Pesan masuk hari ini"),
        value: String(todayIn),
        icon: Inbox,
        hint: t("Kalender · {tz}", { tz: reportingTz }),
      },
      {
        label: t("Dibalas AI"),
        value: String(todayAi),
        icon: Bot,
        hint: t("{pct}% dari masuk hari ini", { pct: todayAiPct }),
      },
      {
        label: t("Open rate"),
        value: openFmt.value,
        icon: TrendingUp,
        hint:
          openFmt.hint === "Butuh data"
            ? t("Butuh data")
            : t("Pesan keluar terbaca ({windowDays} hari)", { windowDays }),
      },
      {
        label: t("Avg. respon"),
        value: avgFmt.value,
        icon: MessageSquare,
        hint:
          avgFmt.hint === "Butuh data"
            ? t("Butuh data")
            : t("Rata-rata ke balasan pertama"),
      },
    ],
    [t, todayIn, todayAi, todayAiPct, reportingTz, openFmt, avgFmt, windowDays],
  );

  if (!tenantDashboardAccess) {
    return null;
  }

  return (
    <>
      <PageHeader
        title={t("Halo, {name} 👋", {
          name: user?.name?.split(" ")[0] || t("Owner"),
        })}
        description={t("Berikut ringkasan {tenant} hari ini.", {
          tenant: user?.tenant?.name ?? t("bisnis Anda"),
        })}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {s.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {user?.role === "owner" ? <UsageQuotaSummaryCard /> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("Setup checklist")}</CardTitle>
          <CardDescription>
            {t("Selesaikan langkah berikut supaya AI siap balas pelanggan.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {setupSteps.map((step) => (
            <div
              key={step.key}
              className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className={
                    step.done
                      ? "h-5 w-5 text-primary"
                      : "h-5 w-5 text-muted-foreground/40"
                  }
                />
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  {step.done ? (
                    <Badge variant="success" className="mt-1">
                      {t("Selesai")}
                    </Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("Belum dikerjakan")}
                    </p>
                  )}
                </div>
              </div>
              {!step.done && (
                <Button asChild size="sm" variant="outline">
                  <Link href={step.href}>
                    {t("Kerjakan")}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-4 w-4 text-primary" />
              {t("Status WhatsApp")}
            </CardTitle>
            <CardDescription>
              {t("Hubungkan nomor bisnis Anda untuk mulai menerima chat.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={hasConnectedWhatsapp ? "success" : "outline"}>
              {hasConnectedWhatsapp ? t("Tersambung") : t("Belum tersambung")}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {hasConnectedWhatsapp
                ? t(
                    "Nomor bisnis Anda sudah aktif dan siap menerima chat masuk.",
                  )
                : t(
                    "Hubungkan nomor bisnis Anda untuk mulai menerima chat masuk.",
                  )}
            </p>
            <Button
              asChild
              size="sm"
              variant={hasConnectedWhatsapp ? "outline" : "default"}
            >
              <Link
                href={
                  hasConnectedWhatsapp
                    ? "/dashboard/whatsapp"
                    : "/dashboard/whatsapp/onboarding"
                }
              >
                {hasConnectedWhatsapp
                  ? t("Kelola koneksi")
                  : t("Connect sekarang")}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              {t("AI status")}
            </CardTitle>
            <CardDescription>
              {t("AI akan aktif setelah info bisnis & FAQ minimal terisi.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={aiReady ? "success" : "warning"}>
              {aiReady ? t("Siap membalas") : t("Menunggu konfigurasi")}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {aiReady
                ? t("Info bisnis dan FAQ sudah memenuhi minimum.")
                : t("Lengkapi profil bisnis dan minimal 5 entri FAQ.")}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link
                href={
                  profileDone
                    ? "/dashboard/knowledge-base"
                    : "/dashboard/ai-settings"
                }
              >
                {profileDone ? t("Kelola FAQ") : t("Lengkapi profil")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
