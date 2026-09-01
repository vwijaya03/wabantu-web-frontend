"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import {
  aiRegressionApi,
  type AIRegressionSuiteDetail,
  type RunAIRegressionResponse,
} from "@/lib/api/ai-regression";
import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function SuiteStatusBadge({ passed, skipped }: { passed: boolean; skipped?: boolean }) {
  if (skipped) {
    return <Badge variant="outline">Dilewati</Badge>;
  }
  return passed ? (
    <Badge className="bg-emerald-600 hover:bg-emerald-600">Lulus</Badge>
  ) : (
    <Badge variant="destructive">Gagal</Badge>
  );
}

function BuyerflowSuiteCard({ suite }: { suite: AIRegressionSuiteDetail }) {
  const failed = suite.cases.filter((c) => !c.passed);
  return (
    <Card className={cn(!suite.skipped && !suite.passed && "border-destructive/50")}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{suite.name}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{formatMs(suite.durationMs)}</span>
            <SuiteStatusBadge passed={suite.passed} skipped={suite.skipped} />
          </div>
        </div>
        {suite.skipReason ? (
          <CardDescription>{suite.skipReason}</CardDescription>
        ) : (
          <CardDescription>
            {suite.cases.length} skenario
            {failed.length > 0 ? ` · ${failed.length} gagal` : ""}
          </CardDescription>
        )}
      </CardHeader>
      {failed.length > 0 ? (
        <CardContent className="space-y-2 pt-0">
          {failed.map((c) => (
            <div key={c.name} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">{c.name}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{c.error}</p>
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

function ResultsPanel({ result }: { result: RunAIRegressionResponse }) {
  return (
    <div className="space-y-6">
      <Card className={cn(result.passed ? "border-emerald-500/40" : "border-destructive/50")}>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            {result.passed ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
            <div>
              <CardTitle>{result.passed ? "Semua suite lulus" : "Ada suite yang gagal"}</CardTitle>
              <CardDescription>Total {formatMs(result.durationMs)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            {result.suites.map((s) => (
              <div
                key={s.name}
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  !s.skipped && !s.passed && "border-destructive/40 bg-destructive/5",
                )}
              >
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{formatMs(s.durationMs)}</p>
                {s.skipped ? (
                  <p className="mt-1 text-xs text-muted-foreground">{s.skipReason}</p>
                ) : s.passed ? (
                  <p className="mt-1 text-xs text-emerald-700">OK{s.caseCount ? ` · ${s.caseCount} case` : ""}</p>
                ) : (
                  <p className="mt-1 text-xs text-destructive">
                    {s.failedCase ? `${s.failedCase}: ` : ""}
                    {s.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Detail buyerflow</h2>
        <div className="grid gap-3">
          {result.buyerflow.suites.map((suite) => (
            <BuyerflowSuiteCard key={suite.name} suite={suite} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AIRegressionPage() {
  const { user } = useAuth();
  const [lastResult, setLastResult] = useState<RunAIRegressionResponse | null>(null);

  const runMut = useMutation({
    mutationFn: aiRegressionApi.run,
    onSuccess: (data) => {
      setLastResult(data);
      if (data.passed) {
        toast.success("Regression AI lulus");
      } else {
        toast.error("Regression AI ada yang gagal");
      }
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  if (user?.role !== "super_admin") {
    return (
      <div className="p-6">
        <PageHeader title="AI Regression" description="Hanya untuk super admin platform." />
        <p className="text-sm text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="AI Regression"
        description="Jalankan suite yang sama dengan scripts/run-ai-regression-tests.sh — buyerflow golden, retrieval smoke, dan apiregistry structural."
      />

      <Card>
        <CardHeader>
          <CardTitle>Golden regression</CardTitle>
          <CardDescription>
            Pure Go, tanpa Postgres. Mencakup 13+ skenario acceptance Omah Apparel (catalog, shipping, order, FAQ)
            plus autogen triage. Setara CI job <code className="text-xs">regression-fast</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => runMut.mutate()} disabled={runMut.isPending}>
            {runMut.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menjalankan…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Jalankan regression
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin">← Konsol platform</Link>
          </Button>
        </CardContent>
      </Card>

      {lastResult ? <ResultsPanel result={lastResult} /> : null}
    </div>
  );
}
