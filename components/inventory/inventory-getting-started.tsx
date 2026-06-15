"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  buildInventoryGuideSteps,
  inventoryGuideComplete,
  nextInventoryGuideStep,
} from "@/lib/inventory/getting-started";

const DISMISS_KEY = "wabantu-inventory-guide-dismissed";

type Props = {
  setupCompleted: boolean;
  warehouseCount: number;
  stockRowCount: number;
};

export function InventoryGettingStarted({ setupCompleted, warehouseCount, stockRowCount }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });

  const steps = useMemo(
    () => buildInventoryGuideSteps({ setupCompleted, warehouseCount, stockRowCount }),
    [setupCompleted, warehouseCount, stockRowCount],
  );

  const complete = inventoryGuideComplete(steps);
  const next = nextInventoryGuideStep(steps);
  const requiredSteps = steps.filter((s) => !s.optional);
  const doneCount = requiredSteps.filter((s) => s.done).length;

  if (dismissed && !complete) {
    // Still show compact nudge if user dismissed but not finished
    return (
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Lanjutkan panduan persediaan ({doneCount}/{requiredSteps.length})</p>
            <p className="text-sm text-muted-foreground">
              {next ? `Langkah berikutnya: ${next.title}` : "Hampir selesai — cek daftar di bawah."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.localStorage.removeItem(DISMISS_KEY);
              setDismissed(false);
            }}
          >
            Tampilkan panduan
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (dismissed || complete) {
    return null;
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <Card className="mb-6 border-primary/25 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg">Panduan pemula — mulai dari sini</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ikuti urutan ini sekali saja. Progress: {doneCount} dari {requiredSteps.length} langkah wajib selesai.
          </p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={dismiss} aria-label="Sembunyikan panduan">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {next ? (
          <div className="rounded-lg border border-primary/20 bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Rekomendasi berikutnya</p>
            <p className="mt-1 font-medium">{next.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{next.description}</p>
            <Button asChild className="mt-3" size="sm">
              <Link href={next.href}>
                Kerjakan sekarang
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : null}

        <ol className="space-y-2">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-start gap-3 rounded-md border bg-background/80 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
              >
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={step.done ? "text-muted-foreground line-through" : "font-medium"}>
                      {step.order}. {step.title}
                    </span>
                    {step.optional ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Opsional
                      </Badge>
                    ) : null}
                  </span>
                  {!step.done ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">{step.description}</span>
                  ) : null}
                </span>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>

        <p className="text-xs text-muted-foreground">
          Butuh penjelasan per halaman? Klik ikon{" "}
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px]">?</span> di
          judul halaman.{" "}
          <Link href="/dashboard/docs?q=INVENTORY_MODULE" className="text-primary underline-offset-4 hover:underline">
            Baca dokumentasi lengkap
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
