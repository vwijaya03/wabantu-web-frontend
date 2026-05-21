"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, BookOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryListState } from "@/components/dashboard/query-list-state";
import {
  workflowApi,
  workflowReplyText,
  type WorkflowRule,
} from "@/lib/api/workflow";
import { usePlan } from "@/hooks/use-plan";
import { toApiError } from "@/lib/api/client";

const WORKFLOWS_KEY = ["workflows"] as const;

/** Contoh siap pakai — klik "Pakai contoh" untuk mengisi form. */
const SAMPLE_RULES = [
  {
    name: "Tanya harga",
    trigger: "harga",
    reply:
      "Halo kak! Untuk daftar harga terbaru, silakan cek katalog kami atau ketik produk yang dimaksud (mis. skinny jeans XL) ya 😊",
  },
  {
    name: "Info pengiriman",
    trigger: "ongkir",
    reply:
      "Halo kak, ongkir kami menyesuaikan kota tujuan. Boleh kirim alamat lengkap (kelurahan, kecamatan, kota) supaya tim kami hitungkan ya 🙏",
  },
  {
    name: "Jam operasional",
    trigger: "buka",
    reply:
      "Halo kak! Toko online kami aktif setiap hari. Pesan di luar jam kerja tetap masuk — tim CS membalas secepatnya.",
  },
  {
    name: "Reseller / grosir",
    trigger: "reseller",
    reply:
      "Halo kak, untuk info reseller/grosir silakan hubungi admin di Instagram kami atau tulis jumlah pcs yang diinginkan ya.",
  },
] as const;

type Draft = { name: string; trigger: string; reply: string };

const emptyDraft = (): Draft => ({ name: "", trigger: "", reply: "" });

function ruleToDraft(r: WorkflowRule): Draft {
  return {
    name: r.name,
    trigger: r.triggerValue,
    reply: workflowReplyText(r.actionPayload as Record<string, unknown>),
  };
}

export default function WorkflowPage() {
  const { hasWorkflow } = usePlan();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<WorkflowRule | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: WORKFLOWS_KEY,
    queryFn: () => workflowApi.list(),
    enabled: hasWorkflow,
  });
  const rules = data?.rules ?? [];

  const resetForm = () => {
    setDraft(emptyDraft());
    setEditingId(null);
  };

  const savePayload = () => ({
    name: draft.name.trim(),
    triggerValue: draft.trigger.trim(),
    actionType: "send_reply" as const,
    actionPayload: { replyText: draft.reply.trim() },
  });

  const createMut = useMutation({
    mutationFn: () => workflowApi.create(savePayload()),
    onSuccess: () => {
      toast.success("Rule dibuat");
      resetForm();
      void qc.invalidateQueries({ queryKey: WORKFLOWS_KEY });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const updateMut = useMutation({
    mutationFn: () => workflowApi.update(editingId!, savePayload()),
    onSuccess: () => {
      toast.success("Rule diperbarui");
      resetForm();
      void qc.invalidateQueries({ queryKey: WORKFLOWS_KEY });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => workflowApi.remove(id),
    onSuccess: () => {
      toast.success("Rule dihapus");
      setRuleToDelete(null);
      if (editingId) resetForm();
      void qc.invalidateQueries({ queryKey: WORKFLOWS_KEY });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.trigger.trim() || !draft.reply.trim()) {
      toast.error("Nama, kata kunci, dan balasan wajib diisi");
      return;
    }
    if (editingId) updateMut.mutate();
    else createMut.mutate();
  };

  const applySample = (s: (typeof SAMPLE_RULES)[number]) => {
    setDraft({ name: s.name, trigger: s.trigger, reply: s.reply });
    setEditingId(null);
    toast.message("Contoh dimasukkan ke form — sesuaikan lalu Simpan");
  };

  const startEdit = (r: WorkflowRule) => {
    setEditingId(r.id);
    setDraft(ruleToDraft(r));
  };

  if (!hasWorkflow) {
    return (
      <PageHeader
        title="Workflow"
        description="Upgrade ke paket Business atau Pro untuk automasi kata kunci (rule-based)."
      />
    );
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <>
      <PageHeader
        title="Workflow"
        description="Balasan otomatis jika pesan WhatsApp mengandung kata kunci — dijalankan sebelum AI."
      />

      <Card className="mb-6 border-dashed bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            Cara pakai & contoh
          </CardTitle>
          <CardDescription>
            Workflow cocok untuk pertanyaan berulang (harga, ongkir, jam buka). AI tetap
            menangani percakapan yang tidak cocok dengan rule mana pun.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              Isi <strong className="text-foreground">Nama</strong> (label internal, mis.
              &quot;Tanya harga&quot;).
            </li>
            <li>
              <strong className="text-foreground">Jika pesan mengandung</strong> — kata/frasa
              (tidak case-sensitive), mis. <code className="rounded bg-muted px-1">harga</code>{" "}
              atau <code className="rounded bg-muted px-1">berapa ongkir</code>.
            </li>
            <li>
              <strong className="text-foreground">Balasan otomatis</strong> — teks yang langsung
              dikirim ke WhatsApp (maks disarankan 2–3 kalimat).
            </li>
          </ol>
          <div className="rounded-lg border bg-background p-3">
            <p className="mb-2 flex items-center gap-1 font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Contoh siap pakai
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SAMPLE_RULES.map((s) => (
                <div
                  key={s.name}
                  className="flex flex-col gap-2 rounded-md border p-3 text-xs"
                >
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <p className="mt-1 text-muted-foreground">
                      Kata kunci: <span className="text-foreground">{s.trigger}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-muted-foreground">{s.reply}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-fit"
                    onClick={() => applySample(s)}
                  >
                    Pakai contoh
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: hindari kata terlalu umum (mis. &quot;hai&quot;) agar tidak memicu balasan ke
            semua chat. Rule dengan prioritas lebih tinggi dievaluasi lebih dulu.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit rule" : "Rule baru"}</CardTitle>
            <CardDescription>
              {editingId
                ? "Ubah kata kunci atau balasan, lalu simpan."
                : "Buat rule pertama atau pakai contoh di atas."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="wf-name">Nama</Label>
                <Input
                  id="wf-name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Mis. Tanya harga"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wf-trigger">Jika pesan mengandung</Label>
                <Input
                  id="wf-trigger"
                  value={draft.trigger}
                  onChange={(e) => setDraft((d) => ({ ...d, trigger: e.target.value }))}
                  placeholder="Mis. harga, ongkir, reseller"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wf-reply">Balasan otomatis</Label>
                <Textarea
                  id="wf-reply"
                  rows={4}
                  value={draft.reply}
                  onChange={(e) => setDraft((d) => ({ ...d, reply: e.target.value }))}
                  placeholder="Halo kak! Untuk info harga..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {editingId ? "Simpan perubahan" : "Simpan rule"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rules aktif</CardTitle>
            <CardDescription>
              {rules.length === 0
                ? "Belum ada rule — buat dari form atau contoh di atas."
                : `${rules.length} rule — edit atau hapus kapan saja.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QueryListState
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={rules.length === 0}
              empty={
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Belum ada workflow rule.
                </p>
              }
              onRetry={() => {
                void refetch();
              }}
            >
              <ul className="space-y-3">
                {rules.map((r) => (
                  <li key={r.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{r.name}</p>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Jika mengandung:{" "}
                          <Badge variant="secondary" className="font-normal">
                            {r.triggerValue}
                          </Badge>
                        </div>
                        <p className="mt-2 line-clamp-3 text-muted-foreground">
                          {workflowReplyText(
                            r.actionPayload as Record<string, unknown>,
                          ) || "(balasan kosong)"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${r.name}`}
                          onClick={() => startEdit(r)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Hapus ${r.name}`}
                          disabled={deleteMut.isPending}
                          onClick={() => setRuleToDelete(r)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </QueryListState>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={ruleToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setRuleToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus rule workflow?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left text-sm text-muted-foreground">
                <p>
                  Rule{" "}
                  <span className="font-medium text-foreground">
                    {ruleToDelete?.name}
                  </span>{" "}
                  akan dihapus permanen.
                </p>
                <p>
                  Pelanggan yang mengirim pesan berisi kata kunci{" "}
                  <Badge variant="secondary" className="font-normal">
                    {ruleToDelete?.triggerValue}
                  </Badge>{" "}
                  tidak lagi mendapat balasan otomatis ini.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMut.isPending || !ruleToDelete}
              onClick={() => {
                if (ruleToDelete) deleteMut.mutate(ruleToDelete.id);
              }}
            >
              {deleteMut.isPending ? "Menghapus..." : "Hapus rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
