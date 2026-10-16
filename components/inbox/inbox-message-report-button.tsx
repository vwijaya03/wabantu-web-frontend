"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toApiError } from "@/lib/api/client";
import {
  inboxReportApi,
  REPORT_CATEGORY_OPTIONS,
  type InboxReportCategory,
} from "@/lib/api/inbox-report";
import { useLocale } from "@/lib/i18n/locale";

export function InboxMessageReportButton({ messageId }: { messageId: string }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<InboxReportCategory>("wrong_answer");
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["inbox-message-report", messageId],
    queryFn: () => inboxReportApi.getMessageReport(messageId),
    staleTime: 30_000,
  });

  const reportMut = useMutation({
    mutationFn: () =>
      inboxReportApi.reportMessage(messageId, {
        category,
        reporterNote: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t("Laporan terkirim — tim platform akan review"));
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["inbox-message-report", messageId] });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const resetForm = () => {
    setCategory("wrong_answer");
    setNote("");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  if (isLoading) {
    return null;
  }
  if (data?.reported) {
    return (
      <span className="text-[10px] text-muted-foreground">{t("Sudah dilapor")}</span>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Flag className="mr-1 h-3 w-3" />
        Report
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Laporkan balasan AI")}</DialogTitle>
            <DialogDescription>
              {t(
                "Laporkan balasan yang salah, bug, atau tidak pantas. Superadmin akan mereview di AI Triage.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("Kategori")}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as InboxReportCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("Catatan (opsional)")}</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("Jelaskan masalahnya…")}
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("Batal")}
            </Button>
            <Button disabled={reportMut.isPending} onClick={() => reportMut.mutate()}>
              {reportMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("Kirim laporan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
