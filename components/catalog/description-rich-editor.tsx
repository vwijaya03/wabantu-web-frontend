"use client";

import { useRef, useState, type ReactNode } from "react";
import { Bold, Eye, Italic, List, ListOrdered, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  plainTextFromMarkdown,
  prefixSelectedLines,
  renderSimpleMarkdown,
  wrapSelection,
} from "@/lib/markdown/simple";

type DescriptionRichEditorProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  hint?: string;
};

export function DescriptionRichEditor({
  id,
  label = "Deskripsi",
  value,
  onChange,
  placeholder = "Opsional, dipakai AI untuk menjawab pertanyaan produk",
  rows = 4,
  className,
  hint,
}: DescriptionRichEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const applyWrap = (before: string, after: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const { next, cursor } = wrapSelection(value, selectionStart, selectionEnd, before, after);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const applyLinePrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const { next, cursor } = prefixSelectedLines(value, selectionStart, selectionEnd, prefix);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-1">
          <div className="flex rounded-md border p-0.5">
            <Button
              type="button"
              variant={mode === "edit" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setMode("edit")}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant={mode === "preview" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setMode("preview")}
              disabled={!value.trim()}
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              Preview
            </Button>
          </div>
        </div>
      </div>

      {mode === "edit" ? (
        <>
          <div className="flex flex-wrap gap-1 rounded-t-md border border-b-0 bg-muted/40 p-1">
            <ToolbarButton label="Tebal" onClick={() => applyWrap("**", "**")}>
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton label="Miring" onClick={() => applyWrap("*", "*")}>
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton label="Bullet" onClick={() => applyLinePrefix("- ")}>
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton label="Nomor" onClick={() => applyLinePrefix("1. ")}>
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>
          <Textarea
            id={id}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="rounded-t-none font-mono text-sm leading-relaxed"
          />
        </>
      ) : (
        <div
          className="min-h-[6rem] rounded-md border bg-muted/20 px-3 py-2 text-sm leading-relaxed [&_p]:my-1 [&_ul]:my-1"
          dangerouslySetInnerHTML={{
            __html: value.trim() ? renderSimpleMarkdown(value) : `<p class="text-muted-foreground">${placeholder}</p>`,
          }}
        />
      )}

      <p className="text-xs text-muted-foreground">
        {hint ?? "Mendukung tebal, miring, dan bullet (Markdown). Teks ini dipakai AI saat menjawab pertanyaan produk."}
      </p>
    </div>
  );
}

export function DescriptionPlainPreview({ value, className }: { value: string; className?: string }) {
  if (!value.trim()) return null;
  return <p className={cn("text-xs text-muted-foreground", className)}>{plainTextFromMarkdown(value)}</p>;
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClick} title={label} aria-label={label}>
      {children}
    </Button>
  );
}
