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
import { useEffect } from "react";
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
import { tenantQueryKey } from "@/lib/query/tenant-query-key";

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const tenantKey = useTenantKey();
  const router = useRouter();
  const tenantReady = hasTenantDashboardAccess(user);

  useEffect(() => {
    if (user && !tenantReady) {
      router.replace("/dashboard/admin");
    }
  }, [user, tenantReady, router]);

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

  if (!tenantReady) {
    return null;
  }

  const kbTotal = kbList?.total ?? 0;
  const hasConnectedWhatsapp = channels.some((c) => c.status === "connected");
  const profileDone = isBusinessProfileCardComplete(businessProfile ?? null);
  const kbDone = kbTotal >= 5;
  const aiReady = profileDone && kbDone;

  const setupSteps = [
    {
      key: "register",
      label: "Buat akun bisnis",
      done: true,
      href: "#",
    },
    {
      key: "wa",
      label: "Sambungkan WhatsApp",
      done: hasConnectedWhatsapp,
      href: "/dashboard/whatsapp/onboarding",
    },
    {
      key: "profile",
      label: "Lengkapi info bisnis",
      done: profileDone,
      href: "/dashboard/ai-settings",
    },
    {
      key: "kb",
      label: "Isi minimal 5 FAQ",
      done: kbDone,
      href: "/dashboard/knowledge-base/setup",
    },
  ];

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

  const stats = [
    {
      label: "Pesan masuk hari ini",
      value: String(todayIn),
      icon: Inbox,
      hint: `Kalender · ${reportingTz}`,
    },
    {
      label: "Dibalas AI",
      value: String(todayAi),
      icon: Bot,
      hint: `${todayAiPct}% dari masuk hari ini`,
    },
    {
      label: "Open rate",
      value: openFmt.value,
      icon: TrendingUp,
      hint: openFmt.hint,
    },
    {
      label: "Avg. respon",
      value: avgFmt.value,
      icon: MessageSquare,
      hint: avgFmt.hint,
    },
  ];

  return (
    <>
      <PageHeader
        title={`Halo, ${user?.name?.split(" ")[0] || "Owner"} 👋`}
        description={`Berikut ringkasan ${user?.tenant?.name ?? "bisnis Anda"} hari ini.`}
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
          <CardTitle>Setup checklist</CardTitle>
          <CardDescription>
            Selesaikan langkah berikut supaya AI siap balas pelanggan.
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
                      Selesai
                    </Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Belum dikerjakan
                    </p>
                  )}
                </div>
              </div>
              {!step.done && (
                <Button asChild size="sm" variant="outline">
                  <Link href={step.href}>
                    Kerjakan
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
              Status WhatsApp
            </CardTitle>
            <CardDescription>
              Hubungkan nomor bisnis Anda untuk mulai menerima chat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={hasConnectedWhatsapp ? "success" : "outline"}>
              {hasConnectedWhatsapp ? "Tersambung" : "Belum tersambung"}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {hasConnectedWhatsapp
                ? "Nomor bisnis Anda sudah aktif dan siap menerima chat masuk."
                : "Hubungkan nomor bisnis Anda untuk mulai menerima chat masuk."}
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
                {hasConnectedWhatsapp ? "Kelola koneksi" : "Connect sekarang"}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              AI status
            </CardTitle>
            <CardDescription>
              AI akan aktif setelah info bisnis & FAQ minimal terisi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={aiReady ? "success" : "warning"}>
              {aiReady ? "Siap membalas" : "Menunggu konfigurasi"}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {aiReady
                ? "Info bisnis dan FAQ sudah memenuhi minimum."
                : "Lengkapi profil bisnis dan minimal 5 entri FAQ."}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link
                href={
                  profileDone
                    ? "/dashboard/knowledge-base"
                    : "/dashboard/ai-settings"
                }
              >
                {profileDone ? "Kelola FAQ" : "Lengkapi profil"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
