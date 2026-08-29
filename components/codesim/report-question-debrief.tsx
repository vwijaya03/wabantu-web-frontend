"use client";

import type { CodesimReportQuestion } from "@/lib/api/codesim";

function ResultBadge({ q }: { q: CodesimReportQuestion }) {
  if (q.correct) {
    return <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">✓ Benar</span>;
  }
  if (q.partial) {
    return <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">◐ Sebagian</span>;
  }
  return <span className="rounded bg-red-100 px-2 py-0.5 text-red-800">✗ Salah</span>;
}

export function ReportQuestionDebrief({ q }: { q: CodesimReportQuestion }) {
  const d = q.debrief;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Q{q.index}</span>
          <ResultBadge q={q} />
          <span className="text-sm text-slate-500">
            {q.earnedPoints}/{q.maxPoints} poin
          </span>
        </div>
        <span className="text-xs uppercase text-slate-400">{q.type}</span>
      </header>

      <section className="mb-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">Penjelasan</h3>
        {d.answerFeedback && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-900">
            <strong>Kenapa jawaban kamu salah:</strong> {d.answerFeedback}
          </p>
        )}
        {d.correctAnswer && !q.correct && (
          <p className="text-sm text-slate-600">
            Jawaban benar: <strong>{d.correctAnswer}</strong>
            {q.userAnswer && (
              <>
                {" "}
                (kamu: {q.userAnswer})
              </>
            )}
          </p>
        )}
        <p className="text-sm leading-relaxed text-slate-700">{d.explanation}</p>
      </section>

      <section className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-emerald-800">Best practice</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          {d.bestPractices.map((bp) => (
            <li key={bp}>{bp}</li>
          ))}
        </ul>
      </section>

      {d.commonMistakes && d.commonMistakes.length > 0 && (
        <section className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-800">Kesalahan umum</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
            {d.commonMistakes.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      {(d.solutionCode || d.userCode) && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Kode</h3>
          {d.userCode && (
            <details className="mb-2">
              <summary className="cursor-pointer text-sm text-slate-600">Kode kamu</summary>
              <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                {d.userCode}
              </pre>
            </details>
          )}
          {d.solutionCode && (
            <details>
              <summary className="cursor-pointer text-sm text-slate-600">Solusi referensi</summary>
              <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-emerald-100">
                {d.solutionCode}
              </pre>
            </details>
          )}
        </section>
      )}
    </article>
  );
}

export function ScoreSummary({
  earned,
  total,
  grade,
  normalized,
}: {
  earned: number;
  total: number;
  grade: string;
  normalized: number;
}) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
      <p className="text-2xl font-bold text-emerald-900">
        {earned}/{total} poin ({normalized}%) — Grade {grade}
      </p>
    </div>
  );
}
