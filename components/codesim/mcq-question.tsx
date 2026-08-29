"use client";

import type { CodesimExamQuestion } from "@/lib/api/codesim";
import { RichQuestionText } from "@/components/codesim/rich-question-text";

/** Fallback when API stored code only inside question fences. */
function extractLeadingCodeFromQuestion(text: string): string | undefined {
  const match = /```[\w-]*\s*([\s\S]*?)```/.exec(text);
  return match?.[1]?.trim() || undefined;
}

type Props = {
  question: CodesimExamQuestion;
  value?: string;
  onChange: (choiceId: string) => void;
};

export function McqQuestion({ question, value, onChange }: Props) {
  if (!question.mcq) return null;
  const snippet =
    question.mcq.codeSnippet?.trim() ||
    extractLeadingCodeFromQuestion(question.mcq.question);

  return (
    <div className="space-y-4">
      <RichQuestionText
        text={question.mcq.question}
        codeSnippet={snippet}
        className="text-base font-medium leading-relaxed text-slate-900"
      />
      <ul className="space-y-2">
        {question.mcq.choices.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:border-emerald-400 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50">
              <input
                type="radio"
                name={`mcq-${question.index}`}
                value={c.id}
                checked={value === c.id}
                onChange={() => onChange(c.id)}
                className="mt-1"
              />
              <span>{c.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
