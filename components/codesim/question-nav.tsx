"use client";

import type { CodesimExamQuestion } from "@/lib/api/codesim";

type Props = {
  questions: CodesimExamQuestion[];
  currentIndex: number;
  onSelect: (index: number) => void;
  answers?: Record<string, string>;
  codeAnswers?: Record<string, { sourceCode: string; testsPassed: boolean }>;
};

export function QuestionNavigator({
  questions,
  currentIndex,
  onSelect,
  answers,
  codeAnswers,
}: Props) {
  return (
    <nav className="flex flex-col gap-1 text-sm">
      {questions.map((q) => {
        const answered =
          q.type === "mcq"
            ? Boolean(answers?.[String(q.index)])
            : Boolean(codeAnswers?.[String(q.index)]?.sourceCode?.trim());
        const active = q.index === currentIndex;
        return (
          <button
            key={q.index}
            type="button"
            onClick={() => onSelect(q.index)}
            className={`rounded px-2 py-1 text-left ${
              active
                ? "bg-emerald-600 text-white"
                : answered
                  ? "bg-emerald-50 text-emerald-800"
                  : "hover:bg-slate-100"
            }`}
          >
            Q{q.index}{" "}
            <span className="text-xs opacity-70">
              {q.type === "mcq" ? "MCQ" : q.type === "react_build" ? "Build" : "Debug"}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
