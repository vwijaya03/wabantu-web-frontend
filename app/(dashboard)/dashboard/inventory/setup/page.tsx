"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  ExternalLink,
  Loader2,
  MessageSquare,
  Scale,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import {
  inventoryApi,
  COSTING_METHOD_LABELS,
  type CostingMethod,
  type WizardAnswers,
  type WizardRecommendation,
} from "@/lib/api/inventory";
import {
  inventorySetupInterviewApi,
  mergeInvSetupSession,
  normalizeInvSetupSession,
  type InvSetupInterviewSession,
} from "@/lib/api/inventory-setup-interview";
import { COSTING_METHOD_GUIDES } from "@/lib/inventory/costing-guide";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const QUICK_REPLIES = [
  "Jual frozen food, stok cepat keluar",
  "Retail umum, stok lambat",
  "Harga beli naik-turun tiap minggu",
  "Cukup, lanjut rekomendasi",
];

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  retail: "Retail / toko umum",
  food: "Makanan / minuman / frozen",
  fashion: "Fashion / apparel",
  manufacturing: "Produksi / manufaktur ringan",
  services: "Jasa dengan material",
  other: "Lainnya",
};

const STOCK_TURNOVER_LABELS: Record<string, string> = {
  fast: "Cepat (harian/mingguan)",
  medium: "Sedang (2–4 minggu)",
  slow: "Lambat (bulanan+)",
};

const PRICE_TREND_LABELS: Record<string, string> = {
  stable: "Stabil",
  rising: "Cenderung naik",
  volatile: "Naik-turun sering",
};

const DRAFT_FLAGS: Array<{ key: keyof WizardAnswers; label: string }> = [
  { key: "perishable", label: "Produk perishable" },
  { key: "usesExpiryDates", label: "Pakai tanggal kedaluwarsa" },
  { key: "needBatchTracking", label: "Telusur batch/lot" },
  { key: "highVolumeUniform", label: "Volume tinggi & seragam" },
  { key: "priceVolatile", label: "Harga beli fluktuatif" },
  { key: "seasonalStock", label: "Stok musiman" },
];

function SetAverageButton({
  onClick,
  disabled,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={onClick} disabled={disabled}>
      <Scale className="mr-2 h-4 w-4" />
      Set metode Average
    </Button>
  );
}

function SkipAverageHint({ onSetAverage, disabled }: { onSetAverage: () => void; disabled?: boolean }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
      <p className="font-medium text-foreground">Sudah yakin pakai Average?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Simpan metode HPP Average sekarang. Wawancara chat tetap wajib sebelum modul persediaan bisa diaktifkan.
      </p>
      <SetAverageButton onClick={onSetAverage} disabled={disabled} className="mt-2" />
    </div>
  );
}

function scrollChatContainer(el: HTMLDivElement | null, force = false) {
  if (!el) return;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  if (force || nearBottom) {
    el.scrollTop = el.scrollHeight;
  }
}

function draftLabel(map: Record<string, string>, value: string): string {
  const v = value.trim();
  if (!v) return "—";
  return map[v] ?? v;
}

export default function InventorySetupPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const stickChatToBottomRef = useRef(true);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [session, setSession] = useState<InvSetupInterviewSession | null>(null);
  const [input, setInput] = useState("");
  const [rec, setRec] = useState<WizardRecommendation | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ used?: number; remaining?: number }>({});
  const [methodApplied, setMethodApplied] = useState(false);

  const { data: setting } = useQuery({
    queryKey: ["inventory", "setting"],
    queryFn: () => inventoryApi.getSetting(),
  });

  const startMut = useMutation({
    mutationFn: () => inventorySetupInterviewApi.start(),
    onSuccess: (data) => {
      stickChatToBottomRef.current = true;
      setSession(normalizeInvSetupSession(data));
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const sendMut = useMutation({
    mutationFn: (message: string) => inventorySetupInterviewApi.sendMessage(session!.sessionId, message),
    onSuccess: (data) => {
      stickChatToBottomRef.current = true;
      setSession((prev) => mergeInvSetupSession(prev, data));
      if (data.tokensUsed > 0) {
        toast.success(`Balasan AI (${data.tokensUsed} token)`, { duration: 2500 });
      }
    },
    onError: (e) => {
      const err = toApiError(e);
      toast.error(err.message);
      const sessionLost =
        err.status === 404 ||
        /tidak ditemukan|kedaluwarsa/i.test(err.message);
      if (sessionLost && step === 2) {
        startMut.reset();
        setSession(null);
        toast.info("Sesi chat kedaluwarsa — memulai sesi baru…");
        startMut.mutate();
      }
    },
  });

  const finishMut = useMutation({
    mutationFn: () => inventorySetupInterviewApi.finish(session!.sessionId),
    onSuccess: (res) => {
      setRec(res.recommendation);
      setTokenInfo({ used: res.tokensUsed, remaining: res.tokenQuotaRemaining });
      setMethodApplied(false);
      setSession(null);
      setStep(3);
      void qc.invalidateQueries({ queryKey: ["inventory", "setting"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const applyMethodMut = useMutation({
    mutationFn: (method: CostingMethod) => inventoryApi.updateSetting({ defaultCostingMethod: method }),
    onSuccess: () => {
      toast.success("Metode HPP diterapkan");
      setMethodApplied(true);
      void qc.invalidateQueries({ queryKey: ["inventory", "setting"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const completeMut = useMutation({
    mutationFn: () => inventoryApi.completeSetup(),
    onSuccess: () => {
      toast.success("Setup persediaan selesai! Fitur stok aktif.");
      void qc.invalidateQueries({ queryKey: ["inventory", "setting"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  useEffect(() => {
    if (step !== 2 || !canManage || session || startMut.isPending) return;
    startMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start when entering step 2 without session
  }, [step, canManage, session, startMut.isPending]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      stickChatToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [step]);

  const messageCount = session?.messages?.length ?? 0;

  useEffect(() => {
    if (step !== 2) return;
    scrollChatContainer(chatScrollRef.current, stickChatToBottomRef.current);
  }, [step, messageCount, sendMut.isPending]);

  const quotaExhausted =
    (session?.tokenQuotaRemaining ?? 1) <= 0 && (session?.tokenQuotaLimit ?? 0) > 0;

  const canSend =
    !!session &&
    input.trim().length > 0 &&
    !sendMut.isPending &&
    !quotaExhausted &&
    !finishMut.isPending;

  const sendMessage = (text: string) => {
    const msg = text.trim();
    if (!msg || !session) return;
    setInput("");
    stickChatToBottomRef.current = true;
    sendMut.mutate(msg);
  };

  const skipToAverage = () => {
    applyMethodMut.mutate("average");
    toast.success("Metode Average disimpan. Lanjut wawancara chat untuk bisa mengaktifkan modul stok.");
  };

  const goToInterview = () => {
    setSession(null);
    setRec(null);
    setMethodApplied(false);
    startMut.reset();
    setStep(2);
  };

  const canActivateModule =
    Boolean(setting?.wizardInterviewCompleted) &&
    methodApplied &&
    !setting?.setupCompleted;

  const activationBlockedReason = !setting?.wizardInterviewCompleted
    ? "Selesaikan wawancara chat dan dapatkan rekomendasi HPP dulu."
    : !methodApplied
      ? "Klik «Terapkan» pada rekomendasi metode HPP sebelum mengaktifkan modul."
      : null;

  if (!canManage) {
    return (
      <RequireTenantDashboard title="Setup Persediaan">
        <InventoryPageHeader title="Setup Persediaan" description="Hanya owner yang dapat mengatur persediaan." helpTopic="setup" />
      </RequireTenantDashboard>
    );
  }

  const draft = session?.answersDraft;

  return (
    <RequireTenantDashboard title="Setup Persediaan">
      <InventoryPageHeader
        title="Setup Persediaan & HPP"
        description="Pelajari metode HPP, ceritakan pola bisnis lewat chat, lalu dapatkan rekomendasi AI."
        helpTopic="setup"
      />

      <div className="mb-4">
        {setting?.setupCompleted ? (
          <Badge variant="success">Setup selesai · metode {setting.defaultCostingMethod.toUpperCase()}</Badge>
        ) : (
          <Badge variant="warning">Setup belum selesai</Badge>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              if (n === 1) setStep(1);
              if (n === 2) goToInterview();
            }}
            className={cn(
              "rounded-full border px-3 py-1",
              step === n ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
            )}
          >
            {n === 1 ? "① Pelajari metode" : n === 2 ? "② Wawancara chat" : "③ Rekomendasi"}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {(["fifo", "lifo", "average"] as CostingMethod[]).map((m) => {
            const g = COSTING_METHOD_GUIDES[m];
            return (
              <Card key={m}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{g.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{g.short}</p>
                  <p>{g.example}</p>
                  <p>
                    <span className="font-medium text-foreground">Cocok untuk: </span>
                    {g.bestFor}
                  </p>
                </CardContent>
              </Card>
            );
          })}
          <div className="lg:col-span-3 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-end sm:justify-between">
            <SkipAverageHint onSetAverage={skipToAverage} disabled={applyMethodMut.isPending} />
            <Button className="shrink-0" onClick={() => setStep(2)}>
              Lanjut — wawancara chat
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Wawancara setup HPP
              </CardTitle>
              <CardDescription>
                Ceritakan produk dan pola stok seperti chat WhatsApp. AI menyiapkan rekomendasi FIFO, LIFO, atau Average.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {session?.quotaNotice ? (
                <p className="text-xs text-muted-foreground">{session.quotaNotice}</p>
              ) : null}

              <div
                ref={chatScrollRef}
                className="flex max-h-[420px] min-h-[280px] flex-col gap-3 overflow-y-auto rounded-lg border bg-muted/20 p-4"
                role="log"
                aria-live="polite"
                aria-label="Riwayat chat setup persediaan"
              >
                {startMut.isError && !session ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm">
                    <p className="text-destructive">Gagal memulai sesi wawancara.</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => startMut.mutate()}>
                      Coba lagi
                    </Button>
                  </div>
                ) : null}
                {startMut.isPending && !session ? (
                  <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyiapkan sesi…
                  </div>
                ) : null}
                {(session?.messages ?? []).map((m, i) => (
                  <div
                    key={`${m.role}-${i}`}
                    className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {m.role === "assistant" ? (
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" aria-hidden />
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                        m.role === "user"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md border bg-card",
                      )}
                    >
                      {m.content}
                    </div>
                    {m.role === "user" ? (
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" aria-hidden />
                      </span>
                    ) : null}
                  </div>
                ))}
                {sendMut.isPending ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI mengetik…
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((chip) => (
                  <Button
                    key={chip}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full text-xs"
                    disabled={!session || sendMut.isPending || quotaExhausted || finishMut.isPending}
                    onClick={() => sendMessage(chip)}
                  >
                    {chip}
                  </Button>
                ))}
              </div>

              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ceritakan produk & pola stok Anda…"
                  disabled={!session || sendMut.isPending || quotaExhausted || finishMut.isPending}
                  maxLength={2000}
                  aria-label="Pesan ke AI setup persediaan"
                />
                <Button type="submit" disabled={!canSend} size="icon" aria-label="Kirim">
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              {session?.readyForRecommendation ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={finishMut.isPending}
                  onClick={() => finishMut.mutate()}
                >
                  {finishMut.isPending ? "Menghitung rekomendasi…" : "Lanjut ke rekomendasi HPP"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : null}

              <div className="space-y-3 border-t pt-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Kembali
                </Button>
                <SkipAverageHint onSetAverage={skipToAverage} disabled={applyMethodMut.isPending} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Ringkasan otomatis
                </CardTitle>
                <CardDescription>Terisi saat Anda chat. Dipakai AI untuk rekomendasi HPP.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Jenis bisnis</span>
                  <span className="text-right font-medium">
                    {draftLabel(BUSINESS_TYPE_LABELS, draft?.businessType ?? "")}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Produk & pola stok</p>
                  <p className="mt-1 rounded-md border bg-muted/30 p-2 text-xs leading-relaxed">
                    {draft?.productDescription?.trim() || "—"}
                  </p>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Kecepatan stok</span>
                  <span>{draftLabel(STOCK_TURNOVER_LABELS, draft?.stockTurnover ?? "")}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Tren harga beli</span>
                  <span>{draftLabel(PRICE_TREND_LABELS, draft?.priceTrend ?? "")}</span>
                </div>
                {draft?.ownerNotes?.trim() ? (
                  <div>
                    <p className="text-muted-foreground">Catatan</p>
                    <p className="mt-1 text-xs">{draft.ownerNotes}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {DRAFT_FLAGS.filter((f) => draft && Boolean(draft[f.key])).map((f) => (
                    <Badge key={f.key} variant="secondary" className="text-xs">
                      {f.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Kebijakan operasional</CardTitle>
                <CardDescription>
                  Blokir stok minus & mode cashflow diatur di halaman pengaturan — tidak perlu diisi saat wawancara.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <ul className="space-y-1.5 text-muted-foreground">
                  <li>
                    Blokir stok minus:{" "}
                    <span className="font-medium text-foreground">
                      {setting?.blockNegativeStock ?? true ? "Aktif" : "Nonaktif"}
                    </span>
                  </li>
                  <li>
                    Mode cashflow:{" "}
                    <span className="font-medium text-foreground">
                      {setting?.purchasePostsExpense ? "Aktif" : "Nonaktif (disarankan)"}
                    </span>
                  </li>
                </ul>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/inventory/settings">
                    Buka Pengaturan Persediaan
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {step === 3 && rec ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Rekomendasi metode HPP
              <Badge variant={rec.source === "ai" ? "default" : "secondary"}>
                {rec.source === "ai" ? "AI" : "Aturan sistem"}
              </Badge>
            </CardTitle>
            {rec.source === "rules" ? (
              <CardDescription>
                Rekomendasi dari aturan bisnis — layanan AI sementara tidak tersedia atau tidak dipakai untuk
                putaran ini.
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="text-lg font-semibold">{COSTING_METHOD_LABELS[rec.method]}</p>
              <p className="mt-2">{rec.reason}</p>
              {rec.summary ? <p className="mt-2 text-muted-foreground">{rec.summary}</p> : null}
            </div>
            <div className="rounded-lg border p-4 text-sm">
              <p className="font-medium">{COSTING_METHOD_GUIDES[rec.method].title}</p>
              <p className="mt-1 text-muted-foreground">{COSTING_METHOD_GUIDES[rec.method].example}</p>
            </div>
            {tokenInfo.used ? (
              <p className="text-xs text-muted-foreground">
                Token AI dipakai: {tokenInfo.used}
                {tokenInfo.remaining !== undefined ? ` · sisa kuota: ${tokenInfo.remaining}` : ""}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={goToInterview}>
                Ulangi wawancara
              </Button>
              <Button onClick={() => applyMethodMut.mutate(rec.method)} disabled={applyMethodMut.isPending}>
                Terapkan {rec.method.toUpperCase()}
              </Button>
            </div>

            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">④ Aktifkan modul</CardTitle>
                <CardDescription>
                  Setelah gudang & saldo awal siap, aktifkan agar pesanan mulai memotong stok otomatis.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {setting?.setupCompleted
                    ? "Modul persediaan sudah aktif."
                    : activationBlockedReason ??
                      "Wawancara dan metode HPP sudah siap — Anda bisa mengaktifkan modul."}
                </p>
                <Button
                  onClick={() => completeMut.mutate()}
                  disabled={completeMut.isPending || setting?.setupCompleted || !canActivateModule}
                >
                  {setting?.setupCompleted ? "Sudah aktif" : "Aktifkan modul persediaan"}
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      ) : null}

      {step !== 3 && !setting?.setupCompleted ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Aktivasi modul persediaan tersedia setelah wawancara chat selesai, rekomendasi HPP diterapkan, dan gudang
            siap.
          </CardContent>
        </Card>
      ) : null}
    </RequireTenantDashboard>
  );
}
