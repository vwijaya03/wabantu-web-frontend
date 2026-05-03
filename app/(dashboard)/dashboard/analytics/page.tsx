"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { analyticsApi } from "@/lib/api/analytics";

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () => analyticsApi.overview(30),
    refetchInterval: 60000,
  });
  const totals = data?.totals;
  const kpis = data?.kpis;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Performa AI auto-reply dan kepuasan pelanggan."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total pesan", value: totals?.totalMessages ?? 0 },
          { label: "Inbound", value: totals?.inboundMessages ?? 0 },
          { label: "Dijawab AI", value: totals?.aiReplies ?? 0 },
          { label: "Leads", value: totals?.leadsGenerated ?? 0 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-2 text-2xl font-bold">
                {isLoading ? "..." : s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">AI coverage</p>
            <p className="mt-2 text-2xl font-bold">{kpis?.aiCoveragePct ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Handoff rate</p>
            <p className="mt-2 text-2xl font-bold">{kpis?.handoffRatePct ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Conversion estimate</p>
            <p className="mt-2 text-2xl font-bold">
              {kpis?.conversionEstimatePct ?? 0}%
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pertanyaan paling sering (30 hari)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(data?.topQuestions ?? []).length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Belum ada data pertanyaan masuk.
            </p>
          ) : (
            (data?.topQuestions ?? []).map((q, idx) => (
              <div key={`${q.question}-${idx}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                <p className="line-clamp-1">{q.question}</p>
                <p className="text-xs text-muted-foreground">{q.count}x</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
