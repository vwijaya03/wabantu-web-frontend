"use client";

import type { CodesimReportQuestionPrompt } from "@/lib/api/codesim";
import { RichQuestionText } from "@/components/codesim/rich-question-text";

type Props = {
  prompt: CodesimReportQuestionPrompt;
  type: string;
  userAnswer?: string;
  correctAnswer?: string;
};

export function questionTypeLabel(type: string): string {
  switch (type) {
    case "mcq":
      return "MCQ";
    case "react_build":
      return "React Build";
    case "react_debug":
      return "React Debug";
    default:
      return type;
  }
}

export function promptHeadline(prompt?: CodesimReportQuestionPrompt, type?: string): string {
  if (!prompt) return "Question";
  if (prompt.title && prompt.title !== "Multiple Choice") {
    return prompt.title;
  }
  if (type === "mcq") return "Pilihan ganda";
  if (prompt.body) {
    const first = prompt.body.split("\n").find((line) => line.trim()) ?? "";
    const cleaned = first.replace(/^#+\s*/, "").trim();
    if (cleaned.length > 0) {
      return cleaned.length > 80 ? `${cleaned.slice(0, 77)}…` : cleaned;
    }
  }
  return prompt.title ?? "Question";
}

export function ReportQuestionPrompt({
  prompt,
  type,
  userAnswer,
  correctAnswer,
}: Props) {
  const isMcq = type === "mcq" && prompt.choices && prompt.choices.length > 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Original question</p>
      {prompt.title && prompt.title !== "Multiple Choice" && (
        <h4 className="mt-1 text-sm font-semibold text-slate-900">{prompt.title}</h4>
      )}
      {prompt.body && (
        <div className="mt-3 text-sm leading-relaxed text-slate-700">
          <RichQuestionText
            text={prompt.body}
            codeSnippet={prompt.codeSnippet}
            className="text-sm leading-relaxed text-slate-700"
          />
        </div>
      )}

      {isMcq && (
        <ul className="mt-4 space-y-2">
          {prompt.choices!.map((choice) => {
            const isUser = userAnswer === choice.id;
            const isCorrect = correctAnswer === choice.id;
            let boxClass = "border-slate-200 bg-white text-slate-700";
            if (isCorrect) {
              boxClass = "border-emerald-300 bg-emerald-50 text-emerald-950";
            } else if (isUser) {
              boxClass = "border-red-300 bg-red-50 text-red-950";
            }

            return (
              <li
                key={choice.id}
                className={`rounded-md border px-3 py-2 text-sm ${boxClass}`}
              >
                <span className="mr-2 font-mono text-xs uppercase text-slate-500">
                  {choice.id}.
                </span>
                {choice.text}
                {isUser && (
                  <span className="ml-2 text-xs font-medium">← jawaban kamu</span>
                )}
                {isCorrect && (
                  <span className="ml-2 text-xs font-medium text-emerald-700">✓ kunci</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
