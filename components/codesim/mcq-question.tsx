"use client";

import type { CodesimExamQuestion } from "@/lib/api/codesim";

type Props = {
  question: CodesimExamQuestion;
  value?: string;
  onChange: (choiceId: string) => void;
};

export function McqQuestion({ question, value, onChange }: Props) {
  if (!question.mcq) return null;
  return (
    <div className="space-y-4">
      <p className="text-base font-medium leading-relaxed">{question.mcq.question}</p>
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
