"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type PromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onSubmit: (value: string) => void;
};

function PromptDialogForm({
  title,
  description,
  placeholder,
  confirmLabel = "Simpan",
  cancelLabel = "Batal",
  destructive = false,
  loading = false,
  onSubmit,
}: Omit<PromptDialogProps, "open" | "onOpenChange">) {
  const [value, setValue] = useState("");

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
      </AlertDialogHeader>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="resize-none"
      />
      <AlertDialogFooter>
        <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
        <Button
          type="button"
          variant={destructive ? "destructive" : "default"}
          disabled={loading}
          onClick={() => onSubmit(value.trim())}
        >
          {loading ? "Memproses..." : confirmLabel}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

export function PromptDialog({ open, onOpenChange, ...formProps }: PromptDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {open ? <PromptDialogForm key="active" {...formProps} /> : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
