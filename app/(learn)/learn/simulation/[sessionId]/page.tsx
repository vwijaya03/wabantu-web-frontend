"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { codesimApi, type CodesimExamQuestion, type CodesimSession } from "@/lib/api/codesim";
import { ExamTimer } from "@/components/codesim/exam-timer";
import { QuestionNavigator } from "@/components/codesim/question-nav";
import { McqQuestion } from "@/components/codesim/mcq-question";
import { CodeTaskEditor } from "@/components/codesim/code-task-editor";
import { RichQuestionText } from "@/components/codesim/rich-question-text";
import {
  ProctoringBanner,
  ProctoringDisclaimer,
  ProctoringProvider,
  useProctoring,
} from "@/components/codesim/proctoring-provider";

function ExamContent({ session }: { session: CodesimSession }) {
  const router = useRouter();
  const { acknowledged, setAcknowledged } = useProctoring();
  const [currentIndex, setCurrentIndex] = useState(1);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>(
    session.answers?.mcq ?? {}
  );
  const [codeAnswers, setCodeAnswers] = useState<
    Record<string, { sourceCode: string; testsPassed: boolean; testMessage?: string }>
  >(() => {
    const initial: Record<string, { sourceCode: string; testsPassed: boolean; testMessage?: string }> = {};
    for (const [k, v] of Object.entries(session.answers?.code ?? {})) {
      initial[k] = {
        sourceCode: v.sourceCode,
        testsPassed: v.testsPassed,
      };
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = useMemo(
    () => session.questions.find((q) => q.index === currentIndex),
    [session.questions, currentIndex]
  );

  const persistAnswers = useCallback(
  async (mcq: Record<string, string>, code: typeof codeAnswers) => {
    try {
      await codesimApi.saveAnswers(session.id, { mcq, code });
    } catch {
      // silent autosave failure; user can still submit
    }
  },
  [session.id]
);

  const scheduleSave = useCallback(
    (mcq: Record<string, string>, code: typeof codeAnswers) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void persistAnswers(mcq, code), 800);
    },
    [persistAnswers]
  );

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await persistAnswers(mcqAnswers, codeAnswers);
      await codesimApi.submitSession(session.id);
      toast.success("Tes disubmit");
      router.push(`/learn/simulation/${session.id}/report`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal submit");
      setSubmitting(false);
    }
  }, [codeAnswers, mcqAnswers, persistAnswers, router, session.id, submitting]);

  const onExpire = useCallback(() => {
    toast.warning("Waktu habis — mengirim jawaban");
    void handleSubmit();
  }, [handleSubmit]);

  if (!acknowledged) {
    return <ProctoringDisclaimer onAccept={() => setAcknowledged(true)} />;
  }

  const indices = session.questions.map((q) => q.index).sort((a, b) => a - b);
  const pos = indices.indexOf(currentIndex);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <ExamTimer expiresAt={session.expiresAt} onExpire={onExpire} />
        <span className="text-sm text-slate-600">
          Soal {pos + 1}/{session.questions.length}
        </span>
        <ProctoringBanner />
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(10rem,12.5rem)_minmax(0,1fr)]">
        <QuestionNavigator
          questions={session.questions}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
          answers={mcqAnswers}
          codeAnswers={codeAnswers}
        />

        <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          {currentQuestion && <QuestionPanel question={currentQuestion} mcqAnswers={mcqAnswers} codeAnswers={codeAnswers} onMcqChange={(choiceId) => {
            const next = { ...mcqAnswers, [String(currentQuestion.index)]: choiceId };
            setMcqAnswers(next);
            scheduleSave(next, codeAnswers);
          }} onCodeChange={(code) => {
            const key = String(currentQuestion.index);
            const next = {
              ...codeAnswers,
              [key]: { sourceCode: code, testsPassed: false, testMessage: undefined },
            };
            setCodeAnswers(next);
            scheduleSave(mcqAnswers, next);
          }} onTestResult={(passed, message, code) => {
            const key = String(currentQuestion.index);
            const next = {
              ...codeAnswers,
              [key]: { sourceCode: code, testsPassed: passed, testMessage: message },
            };
            setCodeAnswers(next);
            scheduleSave(mcqAnswers, next);
            toast[passed ? "success" : "error"](message);
          }} />}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          disabled={pos <= 0}
          onClick={() => setCurrentIndex(indices[pos - 1])}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          Sebelumnya
        </button>
        <div className="flex gap-2">
          {pos < indices.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex(indices[pos + 1])}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            >
              Berikutnya
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Submit tes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionPanel({
  question,
  mcqAnswers,
  codeAnswers,
  onMcqChange,
  onCodeChange,
  onTestResult,
}: {
  question: CodesimExamQuestion;
  mcqAnswers: Record<string, string>;
  codeAnswers: Record<string, { sourceCode: string; testsPassed: boolean; testMessage?: string }>;
  onMcqChange: (choiceId: string) => void;
  onCodeChange: (code: string) => void;
  onTestResult: (passed: boolean, message: string, code: string) => void;
}) {
  const key = String(question.index);

  if (question.type === "mcq") {
    return (
      <McqQuestion
        question={question}
        value={mcqAnswers[key]}
        onChange={onMcqChange}
      />
    );
  }

  const starter =
    question.type === "react_build"
      ? question.build?.starterCode ?? ""
      : question.debug?.brokenCode ?? "";
  const title =
    question.type === "react_build"
      ? question.build?.title
      : question.debug?.title;
  const spec =
    question.type === "react_build"
      ? question.build?.specMarkdown
      : question.debug?.bugDescription;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {spec && (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700">
          <RichQuestionText text={spec} className="text-sm leading-relaxed text-slate-700" />
        </div>
      )}
      <CodeTaskEditor
        key={question.index}
        initialCode={codeAnswers[key]?.sourceCode ?? starter}
        question={question}
        onChange={onCodeChange}
        onTestResult={onTestResult}
        testsPassed={codeAnswers[key]?.testsPassed}
        testMessage={codeAnswers[key]?.testMessage}
      />
    </div>
  );
}

export default function ExamPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [session, setSession] = useState<CodesimSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await codesimApi.getSession(sessionId);
        if (cancelled) return;
        if (s.status === "submitted") {
          window.location.href = `/learn/simulation/${sessionId}/report`;
          return;
        }
        if (s.status !== "in_progress") {
          toast.error("Sesi belum dimulai — kembali ke setup");
          window.location.href = "/learn/simulation/setup";
          return;
        }
        setSession(s);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal memuat sesi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return <p className="text-slate-600">Memuat ujian…</p>;
  }
  if (!session) {
    return <p className="text-red-600">Sesi tidak ditemukan.</p>;
  }

  return (
    <ProctoringProvider sessionId={session.id} active>
      <ExamContent session={session} />
    </ProctoringProvider>
  );
}
