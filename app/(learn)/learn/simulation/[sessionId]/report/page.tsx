"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { codesimApi, type CodesimReport } from "@/lib/api/codesim";
import {
  ReportQuestionDebrief,
  ScoreSummary,
} from "@/components/codesim/report-question-debrief";

export default function SimulationReportPage() {
  const params = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<CodesimReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await codesimApi.getReport(params.sessionId);
        if (!cancelled) setReport(r);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal memuat laporan");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.sessionId]);

  if (loading) {
    return <p className="text-slate-600">Memuat laporan…</p>;
  }
  if (!report) {
    return <p className="text-red-600">Laporan tidak tersedia.</p>;
  }

  const ls = report.learningSummary;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hasil simulasi</h1>
          <p className="mt-1 text-sm text-slate-600">
            Proctor: blur {report.proctorSummary.blurEvents}, paste{" "}
            {report.proctorSummary.pasteEvents}
          </p>
        </div>
        <Link
          href="/learn/simulation/setup"
          className="text-sm text-emerald-700 hover:underline"
        >
          Ulang simulasi
        </Link>
      </div>

      <ScoreSummary
        earned={report.earnedPoints}
        total={report.totalPoints}
        grade={report.grade}
        normalized={report.normalizedScore}
      />

      {(ls.strengths?.length || ls.weaknesses?.length || ls.recommendedTopics?.length) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {ls.strengths && ls.strengths.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h2 className="mb-2 text-sm font-semibold text-emerald-900">Kekuatan</h2>
              <ul className="list-inside list-disc text-sm text-emerald-800">
                {ls.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {ls.weaknesses && ls.weaknesses.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h2 className="mb-2 text-sm font-semibold text-amber-900">Perlu ulang</h2>
              <ul className="list-inside list-disc text-sm text-amber-900">
                {ls.weaknesses.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {ls.recommendedTopics && ls.recommendedTopics.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold">Rekomendasi belajar</h2>
              <ul className="list-inside list-disc text-sm text-slate-700">
                {ls.recommendedTopics.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Review per soal</h2>
        {report.questions.map((q) => (
          <ReportQuestionDebrief key={q.index} q={q} />
        ))}
      </section>
    </div>
  );
}
