"use client";

import { Fragment, useMemo } from "react";

type Segment =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string; language?: string };

/** Split MCQ stem into prose + fenced code blocks (``` ... ```). */
export function parseQuestionSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const fenceRe = /```([\w-]*)\s*([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRe.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ kind: "text", value: text.slice(last, match.index) });
    }
    segments.push({
      kind: "code",
      language: match[1] || undefined,
      value: match[2].trim(),
    });
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    segments.push({ kind: "text", value: text.slice(last) });
  }

  if (segments.length === 0) {
    return [{ kind: "text", value: text }];
  }
  return segments;
}

function InlineText({ value }: { value: string }) {
  const parts = value.split(/(`[^`\n]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-800"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

type Props = {
  text: string;
  codeSnippet?: string;
  className?: string;
};

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-sm leading-relaxed text-slate-100">
      <code className="font-mono whitespace-pre">{code}</code>
    </pre>
  );
}

export function RichQuestionText({ text, codeSnippet, className }: Props) {
  const segments = useMemo(() => parseQuestionSegments(text), [text]);
  const hasFenceCode = segments.some((s) => s.kind === "code");

  return (
    <div className={className}>
      {codeSnippet && !hasFenceCode && <CodeBlock code={codeSnippet} />}
      {segments.map((seg, i) =>
        seg.kind === "code" ? (
          <CodeBlock key={i} code={seg.value} />
        ) : (
          <span key={i} className="whitespace-pre-wrap">
            <InlineText value={seg.value} />
          </span>
        )
      )}
    </div>
  );
}
