"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { adminApi } from "@/lib/api/admin";
import { aiActivityAdminApi } from "@/lib/api/ai-activity";

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminAIActivityPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState(currentPeriod);
  const [tenantId, setTenantId] = useState<string>("");

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => adminApi.listTenants(),
    enabled: user?.role === "super_admin",
  });

  const tenants = useMemo(() => tenantsData?.tenants ?? [], [tenantsData?.tenants]);
  const effectiveTenantId =
    tenantId || user?.tenant?.id || tenants[0]?.id || "";

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["admin-ai-activity-summary", effectiveTenantId, period],
    queryFn: () => aiActivityAdminApi.summary(effectiveTenantId, { period }),
    enabled: user?.role === "super_admin" && Boolean(effectiveTenantId),
  });

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ["admin-ai-activity-list", effectiveTenantId, period],
    queryFn: () => aiActivityAdminApi.list(effectiveTenantId, { period, limit: 200 }),
    enabled: user?.role === "super_admin" && Boolean(effectiveTenantId),
  });

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === effectiveTenantId),
    [tenants, effectiveTenantId],
  );

  if (user?.role !== "super_admin") {
    return (
      <PageHeader
        title="AI Activity"
        description="Halaman ini hanya untuk super admin platform."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Log aktivitas AI"
        description="Internal — pantau path model, token, dan classifier per tenant (super admin)."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Tenant</p>
          <Select
            value={effectiveTenantId}
            onValueChange={setTenantId}
            disabled={tenantsLoading || tenants.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Periode (UTC)</p>
          <input
            type="month"
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin">← Konsol platform</Link>
        </Button>
      </div>

      {selectedTenant && (
        <p className="mb-4 font-mono text-xs text-muted-foreground">
          {selectedTenant.schemaName} · {selectedTenant.ownerEmail || "—"}
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total event", value: summary?.totalEvents ?? 0 },
          { label: "Panggilan LLM", value: summary?.llmCalls ?? 0 },
          { label: "Total token", value: summary?.totalTokens ?? 0 },
          { label: "Periode", value: summary?.period ?? period },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-2 text-2xl font-bold">
                {summaryLoading ? "…" : s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per path</CardTitle>
            <CardDescription>Distribusi keputusan routing / handler</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(summary?.byPath ?? []).length === 0 ? (
              <p className="text-muted-foreground">Belum ada data.</p>
            ) : (
              (summary?.byPath ?? []).map((row) => (
                <div
                  key={row.path}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <Badge variant="secondary">{row.path}</Badge>
                  <span className="text-muted-foreground">
                    {row.count}× · {row.llmCalls} LLM · {row.totalTokens} tok
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per model</CardTitle>
            <CardDescription>Estimasi biaya dari token</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(summary?.byModel ?? []).length === 0 ? (
              <p className="text-muted-foreground">Belum ada panggilan LLM.</p>
            ) : (
              (summary?.byModel ?? []).map((row) => (
                <div
                  key={row.model}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{row.model}</p>
                    <p className="text-xs text-muted-foreground">{row.tier}</p>
                  </div>
                  <span className="text-muted-foreground">
                    {row.calls}× · ${row.estimatedCostUsd.toFixed(4)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event terbaru</CardTitle>
          <CardDescription>
            Maks. 200 baris untuk periode {list?.period ?? period}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {listLoading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : (list?.entries ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada log AI untuk periode ini.
            </p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Waktu</th>
                  <th className="pb-2 pr-3 font-medium">Path</th>
                  <th className="pb-2 pr-3 font-medium">LLM</th>
                  <th className="pb-2 pr-3 font-medium">Model</th>
                  <th className="pb-2 pr-3 font-medium">Token</th>
                  <th className="pb-2 pr-3 font-medium">Classifier</th>
                  <th className="pb-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {(list?.entries ?? []).map((e) => (
                  <tr key={e.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 whitespace-nowrap text-xs">
                      {formatTime(e.createdAt)}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline">{e.path || "—"}</Badge>
                    </td>
                    <td className="py-2 pr-3">{e.llmUsed ? "Ya" : "Tidak"}</td>
                    <td className="py-2 pr-3 max-w-[140px] truncate text-xs">
                      {e.model || "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs">{e.totalTokens}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {e.classifier || "—"}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {e.reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
