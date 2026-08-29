"use client";

import type { CodesimReportQuestion } from "@/lib/api/codesim";
import {
  promptHeadline,
  questionTypeLabel,
  ReportQuestionPrompt,
} from "@/components/codesim/report-question-prompt";

function ResultBadge({ q }: { q: CodesimReportQuestion }) {
  if (q.correct) {
    return <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">✓ Correct</span>;
  }
  if (q.partial) {
    return <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">◐ Sebagian</span>;
  }
  return <span className="rounded bg-red-100 px-2 py-0.5 text-red-800">✗ Incorrect</span>;
}

function ChevronIcon({ open }: { open?: boolean }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ReportQuestionDebrief({ q }: { q: CodesimReportQuestion }) {
  const d = q.debrief;
  const headline = promptHeadline(q.prompt, q.type);
  const defaultOpen = !q.correct && !q.partial;

  return (
    <details
      className="group rounded-lg border border-slate-200 bg-white shadow-sm open:shadow-md [&_summary::-webkit-details-marker]:hidden"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Q{q.index}</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {questionTypeLabel(q.type)}
            </span>
            <ResultBadge q={q} />
            <span className="text-sm text-slate-500">
              {q.earnedPoints}/{q.maxPoints} poin
            </span>
          </div>
          <p className="text-sm font-medium text-slate-800">{headline}</p>
          <p className="text-xs text-slate-500 group-open:hidden">
            Klik untuk lihat soal lengkap & penjelasan
          </p>
        </div>
        <ChevronIcon />
      </summary>

      <div className="space-y-4 border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">
        {q.prompt && (
          <ReportQuestionPrompt
            prompt={q.prompt}
            type={q.type}
            userAnswer={q.userAnswer}
            correctAnswer={d.correctAnswer}
          />
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">Penjelasan & feedback</h3>
          {d.answerFeedback && !q.correct && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-900">
              <strong>Belum terpenuhi:</strong> {d.answerFeedback}
            </p>
          )}
          {d.correctAnswer && !q.correct && q.type === "mcq" && (
            <p className="text-sm text-slate-600">
              Kunci jawaban: <strong>{d.correctAnswer.toUpperCase()}</strong>
              {q.userAnswer && (
                <>
                  {" "}
                  (kamu: {q.userAnswer.toUpperCase()})
                </>
              )}
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {d.explanation}
          </p>
        </section>

        {d.bestPractices.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-emerald-800">Best practice</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
              {d.bestPractices.map((bp) => (
                <li key={bp}>{bp}</li>
              ))}
            </ul>
          </section>
        )}

        {d.commonMistakes && d.commonMistakes.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-amber-800">Kesalahan umum</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
              {d.commonMistakes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </section>
        )}

        {(d.solutionCode || d.userCode) && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Kode</h3>
            {d.userCode && (
              <details className="rounded-lg border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">
                  Kode kamu
                </summary>
                <pre className="overflow-x-auto border-t border-slate-200 bg-slate-900 p-3 text-xs text-slate-100">
                  {d.userCode}
                </pre>
              </details>
            )}
            {d.solutionCode && (
              <details className="rounded-lg border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-700">
                  Solusi referensi
                </summary>
                <pre className="overflow-x-auto border-t border-slate-200 bg-slate-900 p-3 text-xs text-emerald-100">
                  {d.solutionCode}
                </pre>
              </details>
            )}
          </section>
        )}
      </div>
    </details>
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
