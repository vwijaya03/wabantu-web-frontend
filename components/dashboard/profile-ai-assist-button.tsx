"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { businessApi, type ProfileAISuggestField } from "@/lib/api/business";
import { toApiError } from "@/lib/api/client";

type Props = {
  field: ProfileAISuggestField;
  label: string;
  currentValue?: string;
  onApply: (text: string) => void;
  disabled?: boolean;
};

export function ProfileAiAssistButton({
  field,
  label,
  currentValue,
  onApply,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const suggestMut = useMutation({
    mutationFn: () =>
      businessApi.suggestField({
        field,
        hint: hint.trim() || undefined,
      }),
    onSuccess: (res) => {
      setPreview(res.suggestion);
      if (res.tokensUsed > 0) {
        toast.success(`Saran AI siap (${res.tokensUsed} token)`);
      }
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const close = () => {
    setOpen(false);
    setHint("");
    setPreview(null);
    suggestMut.reset();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        disabled={disabled || suggestMut.isPending}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Bantu AI
      </Button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bantu AI — {label}</DialogTitle>
            <DialogDescription>
              AI menyusun teks dari nama bisnis, isian saat ini, dan katalog (jika ada). Kamu
              tetap review sebelum simpan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {currentValue?.trim() ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Isian sekarang</p>
                <p className="whitespace-pre-wrap">{currentValue.trim()}</p>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor={`ai-hint-${field}`}>Petunjuk tambahan (opsional)</Label>
              <Textarea
                id={`ai-hint-${field}`}
                rows={2}
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Contoh: fokus pada jeans wanita, reseller welcome..."
                maxLength={500}
                disabled={suggestMut.isPending}
              />
            </div>
            {preview ? (
              <div className="space-y-1.5">
                <Label>Pratinjau saran</Label>
                <Textarea rows={5} readOnly value={preview} className="bg-muted/30" />
              </div>
            ) : null}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={close}>
              Batal
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={suggestMut.isPending}
                onClick={() => {
                  setPreview(null);
                  suggestMut.mutate();
                }}
              >
                {suggestMut.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyusun…
                  </>
                ) : preview ? (
                  "Buat ulang"
                ) : (
                  "Buat saran"
                )}
              </Button>
              <Button
                type="button"
                disabled={!preview || suggestMut.isPending}
                onClick={() => {
                  if (!preview) return;
                  onApply(preview);
                  close();
                  toast.success("Saran diterapkan — jangan lupa simpan");
                }}
              >
                Pakai saran ini
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
