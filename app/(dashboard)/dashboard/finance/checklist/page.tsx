"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, SkipForward, PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinanceSubPageHeader } from "@/components/finance/finance-sub-page-header";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { financeApi, formatIDR } from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { formatFinanceDate } from "@/lib/finance/utils";
import { useReportingTimezone } from "@/hooks/use-reporting-timezone";

type ChecklistFrequency = "daily" | "monthly";

export default function ChecklistPage() {
  const { user } = useAuth();
  const isOwner = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const reportingTimezone = useReportingTimezone();
  const [tab, setTab] = useState<"today" | "templates">("today");
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    frequency: "daily" as ChecklistFrequency,
    amountHint: "",
    dayOfMonth: "1",
  });

  const { data: today, isLoading } = useQuery({
    queryKey: ["finance-checklist-today"],
    queryFn: () => financeApi.todayChecklist(),
  });

  const { data: templates } = useQuery({
    queryKey: ["finance-checklist-templates"],
    queryFn: () => financeApi.listChecklistTemplates(),
    enabled: tab === "templates",
  });

  const actionMut = useMutation({
    mutationFn: ({ itemId, action }: { itemId: string; action: "done" | "skip" }) =>
      financeApi.checklistAction(itemId, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-checklist-today"] });
    },
    onError: () => toast.error("Gagal memperbarui"),
  });

  const createTemplateMut = useMutation({
    mutationFn: () =>
      financeApi.createChecklistTemplate({
        title: form.title,
        frequency: form.frequency,
        amountHint: form.amountHint ? parseFloat(form.amountHint) : undefined,
        dayOfMonth: form.frequency === "monthly" ? parseInt(form.dayOfMonth, 10) : undefined,
      }),
    onSuccess: () => {
      toast.success("Template ditambahkan");
      qc.invalidateQueries({ queryKey: ["finance-checklist-templates"] });
      setOpenCreate(false);
      setForm({ title: "", frequency: "daily", amountHint: "", dayOfMonth: "1" });
    },
    onError: () => toast.error("Gagal menyimpan"),
  });

  const deleteTemplateMut = useMutation({
    mutationFn: (id: string) => financeApi.deleteChecklistTemplate(id),
    onSuccess: () => {
      toast.success("Template dihapus");
      qc.invalidateQueries({ queryKey: ["finance-checklist-templates"] });
    },
  });

  const items = today?.items ?? [];
  const pending = today?.pending ?? 0;

  return (
    <>
      <FinanceSubPageHeader
        title="Checklist Keuangan"
        description={today?.date ? `Tugas hari ini · ${formatFinanceDate(today.date, reportingTimezone)}` : "Tugas keuangan harian"}
        actions={
          isOwner ? (
            <Button onClick={() => setOpenCreate(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Template
            </Button>
          ) : null
        }
      />

      {/* Tab */}
      <div className="flex gap-2">
        <Button
          variant={tab === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("today")}
        >
          Hari Ini {pending > 0 && <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-[10px]">{pending}</Badge>}
        </Button>
        <Button
          variant={tab === "templates" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("templates")}
        >
          Template
        </Button>
      </div>

      {tab === "today" && (
        <>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Belum ada checklist untuk hari ini.
                {isOwner ? " Tambahkan template untuk mulai." : ""}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id} className={cn(item.status !== "pending" && "opacity-60")}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="shrink-0">
                      {item.status === "done" ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : item.status === "skipped" ? (
                        <SkipForward className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-medium", item.status !== "pending" && "line-through")}>
                        {item.templateTitle}
                      </p>
                      {item.amountHint && (
                        <p className="text-xs text-muted-foreground">Estimasi {formatIDR(item.amountHint)}</p>
                      )}
                    </div>
                    {item.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => actionMut.mutate({ itemId: item.id, action: "skip" })}
                        >
                          Lewati
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => actionMut.mutate({ itemId: item.id, action: "done" })}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Selesai
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "templates" && (
        <>
          {(templates?.templates?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Belum ada template. {isOwner ? "Tambahkan template untuk membuat checklist harian." : ""}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {templates!.templates.map((t) => (
                <Card key={t.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.frequency === "daily" ? "Setiap hari" : t.frequency === "monthly" ? `Setiap tgl ${t.dayOfMonth}` : t.frequency}
                        {t.amountHint ? ` · Estimasi ${formatIDR(t.amountHint)}` : ""}
                      </p>
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteTemplateMut.mutate(t.id)}
                      >
                        Hapus
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create template dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Template Checklist</DialogTitle>
            <DialogDescription>Buat tugas keuangan harian atau bulanan yang muncul di checklist.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Judul Tugas</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="mis. Bayar listrik, Setor kas"
              />
            </div>
            <div>
              <Label>Frekuensi</Label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.frequency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, frequency: e.target.value as ChecklistFrequency }))
                }
              >
                <option value="daily">Setiap hari</option>
                <option value="monthly">Bulanan (tanggal tertentu)</option>
              </select>
            </div>
            {form.frequency === "monthly" && (
              <div>
                <Label>Tanggal setiap bulan (1–28)</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.dayOfMonth}
                  onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
                />
              </div>
            )}
            <div>
              <Label>Estimasi Jumlah (Rp, opsional)</Label>
              <Input
                type="number"
                value={form.amountHint}
                onChange={(e) => setForm((f) => ({ ...f, amountHint: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
            <Button
              onClick={() => createTemplateMut.mutate()}
              disabled={!form.title || createTemplateMut.isPending}
            >
              {createTemplateMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
