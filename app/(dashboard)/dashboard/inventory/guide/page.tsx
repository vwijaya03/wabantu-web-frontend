"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { inventoryApi } from "@/lib/api/inventory";
import {
  buildInventoryGuideSteps,
  INVENTORY_GUIDE_INTRO,
  inventoryGuideComplete,
  nextInventoryGuideStep,
} from "@/lib/inventory/getting-started";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";

export default function InventoryGuidePage() {
  const tenantKey = useTenantKey();
  const { data: setting } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "setting"),
    queryFn: ({ signal }) => inventoryApi.getSetting(signal),
  });
  const { data: stockData } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "stock", "guide"),
    queryFn: ({ signal }) => inventoryApi.listStock({ pageSize: 1 }, signal),
  });

  const stockTotal = stockData?.total ?? 0;

  const steps = buildInventoryGuideSteps({
    setupCompleted: setting?.setupCompleted ?? false,
    warehouseCount: setting?.warehouseCount ?? 0,
    stockRowCount: stockTotal,
  });
  const required = steps.filter((s) => !s.optional);
  const doneCount = required.filter((s) => s.done).length;
  const progressPct = required.length > 0 ? Math.round((doneCount / required.length) * 100) : 0;
  const next = nextInventoryGuideStep(steps);
  const complete = inventoryGuideComplete(steps);

  return (
    <RequireTenantDashboard title="Panduan Persediaan">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/inventory">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali ke Stok
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Panduan Persediaan untuk Pemula"
        description="Langkah demi langkah mengaktifkan dan mengoperasikan modul stok & HPP."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Progress setup</CardTitle>
          <CardDescription>
            {complete
              ? "Selamat — langkah wajib sudah selesai. Anda bisa lanjut operasional harian."
              : `${doneCount} dari ${required.length} langkah wajib selesai.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progressPct} className="h-2" />
          {next ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-primary">Langkah berikutnya</p>
              <p className="mt-1">{next.title}</p>
              <Button asChild size="sm" className="mt-2">
                <Link href={next.href}>Kerjakan sekarang</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="mb-6 text-sm text-muted-foreground">{INVENTORY_GUIDE_INTRO}</p>

      <div className="space-y-4">
        {steps.map((step) => (
          <Card key={step.id} className={step.done ? "border-emerald-200/80 bg-emerald-50/30" : undefined}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start gap-3">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">
                      {step.order}. {step.title}
                    </CardTitle>
                    {step.optional ? <Badge variant="secondary">Opsional</Badge> : null}
                    {step.done ? (
                      <Badge variant="outline" className="border-emerald-300 text-emerald-800">
                        Selesai
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription>{step.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            {step.details && step.details.length > 0 ? (
              <CardContent className="space-y-3 pt-0">
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {step.details.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
                <Button variant={step.done ? "outline" : "default"} size="sm" asChild>
                  <Link href={step.href}>{step.done ? "Buka halaman" : "Mulai langkah ini"}</Link>
                </Button>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Butuh referensi teknis?{" "}
          <Link href="/dashboard/docs?q=INVENTORY_MODULE" className="text-primary underline-offset-4 hover:underline">
            Baca dokumentasi modul persediaan
          </Link>
          . Setiap halaman juga punya tombol bantuan{" "}
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px]">?</span> di
          judul.
        </CardContent>
      </Card>
    </RequireTenantDashboard>
  );
}
