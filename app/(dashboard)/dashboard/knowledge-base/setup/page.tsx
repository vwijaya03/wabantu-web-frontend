"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { ProfileAiAssistButton } from "@/components/dashboard/profile-ai-assist-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toApiError } from "@/lib/api/client";
import {
  setupInterviewApi,
  type SetupInterviewFAQDraft,
  type SetupInterviewProfileDraft,
  type SetupInterviewSession,
} from "@/lib/api/setup-interview";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { usageApi } from "@/lib/api/usage";
import { cn } from "@/lib/utils";

const KB_KEY = ["kb-list"] as const;
const PROFILE_KEY = ["business-profile"] as const;

const PHASE_STEPS = [
  { id: "profile", label: "Profil bisnis", hint: "Produk, area kirim, jam buka" },
  { id: "faq", label: "FAQ kebijakan", hint: "Pengiriman, bayar, retur" },
  { id: "review", label: "Review & simpan", hint: "Cek sebelum publish" },
] as const;

const QUICK_REPLIES = [
  "Transfer & COD",
  "Kirim seluruh Indonesia",
  "Senin–Sabtu 09.00–17.00",
  "Cukup, lanjut review",
];

function draftStr(v: string | null | undefined): string {
  return v?.trim() ?? "";
}

function profileFromSession(draft: SetupInterviewProfileDraft) {
  return {
    businessName: draftStr(draft.businessName),
    description: draftStr(draft.description),
    address: draftStr(draft.address),
    openingHours: draftStr(draft.openingHours),
    productsServices: draftStr(draft.productsServices),
    basePricing: draftStr(draft.basePricing),
    deliveryArea: draftStr(draft.deliveryArea),
  };
}

function phaseIndex(phase: string, ready: boolean): number {
  if (ready || phase === "review") return 2;
  if (phase === "faq") return 1;
  return 0;
}

function scrollChatContainer(el: HTMLDivElement | null, force = false) {
  if (!el) return;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  if (force || nearBottom) {
    el.scrollTop = el.scrollHeight;
  }
}

export default function KnowledgeBaseSetupPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const stickChatToBottomRef = useRef(true);

  const [session, setSession] = useState<SetupInterviewSession | null>(null);
  const [input, setInput] = useState("");
  const [profileEdit, setProfileEdit] = useState(() => profileFromSession({}));
  const [faqItems, setFaqItems] = useState<SetupInterviewFAQDraft[]>([]);
  const [showReview, setShowReview] = useState(false);

  const canSetup = canPerformOwnerActions(user);

  const { data: usage } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: () => usageApi.summary(),
    enabled: canSetup,
  });

  const tokenQuota = useMemo(
    () => usage?.quotas.find((q) => q.eventType === "ai_token"),
    [usage],
  );

  const startMut = useMutation({
    mutationFn: () => setupInterviewApi.start(),
    onSuccess: (data) => {
      setSession(data);
      setProfileEdit(profileFromSession(data.profileDraft));
      setFaqItems(data.faqDrafts.map((f) => ({ ...f })));
      setShowReview(data.readyForReview);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const sendMut = useMutation({
    mutationFn: (message: string) => setupInterviewApi.sendMessage(session!.sessionId, message),
    onSuccess: (data) => {
      setSession(data);
      setProfileEdit(profileFromSession(data.profileDraft));
      setFaqItems(data.faqDrafts.map((f) => ({ ...f })));
      if (data.readyForReview || data.phase === "review") {
        setShowReview(true);
      }
      if (data.tokensUsed > 0) {
        toast.success(`Balasan AI (${data.tokensUsed} token)`, { duration: 2500 });
      }
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const publishMut = useMutation({
    mutationFn: () =>
      setupInterviewApi.publish(session!.sessionId, {
        profile: {
          businessName: profileEdit.businessName || undefined,
          description: profileEdit.description || undefined,
          address: profileEdit.address || undefined,
          openingHours: profileEdit.openingHours || undefined,
          productsServices: profileEdit.productsServices || undefined,
          basePricing: profileEdit.basePricing || undefined,
          deliveryArea: profileEdit.deliveryArea || undefined,
        },
        faq: faqItems.map((f) => ({
          question: f.question,
          answer: f.answer,
          category: f.category,
          include: f.include,
        })),
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      void qc.invalidateQueries({ queryKey: KB_KEY });
      void qc.invalidateQueries({ queryKey: PROFILE_KEY });
      void qc.invalidateQueries({ queryKey: ["usage-summary"] });
      router.push("/dashboard/knowledge-base");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  useEffect(() => {
    if (!canSetup || session || startMut.isPending || startMut.isSuccess) return;
    startMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per mount
  }, [canSetup]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      stickChatToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const messageCount = session?.messages.length ?? 0;

  useEffect(() => {
    scrollChatContainer(chatScrollRef.current, stickChatToBottomRef.current);
  }, [messageCount, sendMut.isPending]);

  const quotaBanner =
    session?.quotaNotice ??
    (tokenQuota
      ? `Setiap balasan AI setup memakai kuota token bulanan. Sisa: ${tokenQuota.remaining} dari ${tokenQuota.limit}.`
      : "Setiap balasan AI setup memakai kuota token bulanan toko Anda.");

  const quotaExhausted =
    (session?.tokenQuotaRemaining ?? tokenQuota?.remaining ?? 1) <= 0 &&
    (session?.tokenQuotaLimit ?? tokenQuota?.limit ?? 0) > 0;

  const currentStep = phaseIndex(session?.phase ?? "profile", session?.readyForReview ?? false);
  const includedFaq = faqItems.filter((f) => f.include).length;
  const canSend =
    !!session &&
    input.trim().length > 0 &&
    !sendMut.isPending &&
    !quotaExhausted &&
    !publishMut.isPending;
  const canPublish =
    !!session &&
    includedFaq > 0 &&
    profileEdit.productsServices.trim().length > 0 &&
    profileEdit.deliveryArea.trim().length > 0 &&
    !publishMut.isPending;

  const sendMessage = (text: string) => {
    const msg = text.trim();
    if (!msg || !session) return;
    setInput("");
    stickChatToBottomRef.current = true;
    sendMut.mutate(msg);
  };

  if (!canSetup) {
    return (
      <>
        <PageHeader
          title="Setup AI dengan wawancara"
          description="Wizard ini untuk owner toko atau admin platform saat mode pantau tenant aktif."
        />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {user?.role === "super_admin"
              ? "Aktifkan mode pantau tenant di banner atas, lalu buka halaman ini lagi."
              : "Minta owner toko menyelesaikan setup profil & FAQ lewat halaman ini."}
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/dashboard/knowledge-base">Kembali ke Knowledge Base</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Setup AI — wawancara singkat"
        description="Ceritakan bisnis Anda lewat chat; AI susun profil toko dan draft FAQ. Anda review dulu sebelum disimpan."
      />
      <p className="mb-4 text-sm">
        <Link
          href="/dashboard/knowledge-base"
          className="text-primary underline-offset-4 hover:underline"
        >
          ← Kembali ke Knowledge Base
        </Link>
      </p>

      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-medium">Peringatan kuota AI</p>
        <p className="mt-1">{quotaBanner}</p>
        {quotaExhausted ? (
          <p className="mt-2 font-medium text-red-700 dark:text-red-300">
            Kuota token habis — chat AI tidak bisa dilanjutkan sampai periode berikutnya atau upgrade
            paket.
          </p>
        ) : null}
      </div>

      {/* Progress steps */}
      <ol className="mb-6 grid gap-3 sm:grid-cols-3">
        {PHASE_STEPS.map((step, idx) => {
          const done = idx < currentStep;
          const active = idx === currentStep;
          return (
            <li
              key={step.id}
              className={cn(
                "rounded-lg border px-4 py-3 transition-colors",
                active && "border-primary bg-primary/5",
                done && !active && "border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/20",
                !done && !active && "bg-muted/30",
              )}
            >
              <div className="flex items-center gap-2">
                {done && !active ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {idx + 1}
                  </span>
                )}
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              <p className="mt-1 pl-8 text-xs text-muted-foreground">{step.hint}</p>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chat */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              Percakapan setup
            </CardTitle>
            <CardDescription>
              Jawab santai seperti chat WhatsApp. Setup umum tidak perlu harga SKU. FAQ rekening
              untuk verifikasi bukti transfer bisa ditambah manual setelah publish (opsional).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              ref={chatScrollRef}
              className="flex max-h-[420px] min-h-[280px] flex-col gap-3 overflow-y-auto rounded-lg border bg-muted/20 p-4"
              role="log"
              aria-live="polite"
              aria-label="Riwayat chat setup"
            >
              {startMut.isError && !session ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm">
                <p className="text-destructive">Gagal memulai sesi setup.</p>
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
              {session?.messages.map((m, i) => (
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

            {!showReview ? (
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((chip) => (
                  <Button
                    key={chip}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full text-xs"
                    disabled={!session || sendMut.isPending || quotaExhausted}
                    onClick={() => sendMessage(chip)}
                  >
                    {chip}
                  </Button>
                ))}
              </div>
            ) : null}

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
                placeholder={
                  showReview
                    ? "Masih bisa koreksi lewat chat…"
                    : "Ketik jawaban Anda…"
                }
                disabled={!session || sendMut.isPending || quotaExhausted || publishMut.isPending}
                maxLength={2000}
                aria-label="Pesan ke AI setup"
              />
              <Button type="submit" disabled={!canSend} size="icon" aria-label="Kirim">
                <Send className="h-4 w-4" />
              </Button>
            </form>

            {session?.readyForReview && !showReview ? (
              <Button type="button" variant="secondary" className="w-full" onClick={() => setShowReview(true)}>
                Lanjut ke review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* Live draft summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Draft otomatis
            </CardTitle>
            <CardDescription>Perbarui saat Anda chat. Edit final di panel review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Profil</p>
              <ul className="mt-2 space-y-1.5">
                {[
                  ["Produk/jasa", profileEdit.productsServices],
                  ["Area kirim", profileEdit.deliveryArea],
                  ["Jam buka", profileEdit.openingHours],
                  ["Pembayaran", profileEdit.basePricing],
                ].map(([label, val]) => (
                  <li key={label} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cn("text-right", !val && "italic text-muted-foreground/70")}>
                      {val || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">FAQ draft</p>
              <p className="mt-2">
                {faqItems.length === 0 ? (
                  <span className="text-muted-foreground italic">Belum ada — lanjutkan chat</span>
                ) : (
                  <>
                    <span className="font-medium">{faqItems.length}</span> pertanyaan terdeteksi
                  </>
                )}
              </p>
            </div>
            {session ? (
              <p className="text-xs text-muted-foreground">
                Sisa kuota: {session.tokenQuotaRemaining} / {session.tokenQuotaLimit}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Review panel */}
      {showReview && session ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Review sebelum simpan</CardTitle>
            <CardDescription>
              Periksa profil dan centang FAQ yang ingin dipublish ke Knowledge Base. Harga produk spesifik
              tidak disimpan di FAQ — arahkan pelanggan ke katalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="si-name">Nama bisnis</Label>
                <Input
                  id="si-name"
                  value={profileEdit.businessName}
                  onChange={(e) => setProfileEdit((p) => ({ ...p, businessName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="si-products">Produk / jasa *</Label>
                  <ProfileAiAssistButton
                    field="productsServices"
                    label="Produk / jasa"
                    currentValue={profileEdit.productsServices}
                    onApply={(text) =>
                      setProfileEdit((p) => ({ ...p, productsServices: text }))
                    }
                  />
                </div>
                <Textarea
                  id="si-products"
                  rows={2}
                  value={profileEdit.productsServices}
                  onChange={(e) => setProfileEdit((p) => ({ ...p, productsServices: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="si-delivery">Area pengiriman *</Label>
                <Input
                  id="si-delivery"
                  value={profileEdit.deliveryArea}
                  onChange={(e) => setProfileEdit((p) => ({ ...p, deliveryArea: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="si-hours">Jam operasional</Label>
                <Input
                  id="si-hours"
                  value={profileEdit.openingHours}
                  onChange={(e) => setProfileEdit((p) => ({ ...p, openingHours: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="si-pay">Cara bayar (metode umum, tanpa nomor rekening)</Label>
                <p className="text-xs text-muted-foreground">
                  Untuk auto-verify bukti transfer, tambahkan FAQ rekening terpisah di Knowledge Base.
                </p>
                <Input
                  id="si-pay"
                  value={profileEdit.basePricing}
                  onChange={(e) => setProfileEdit((p) => ({ ...p, basePricing: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="si-desc">Deskripsi singkat</Label>
                  <ProfileAiAssistButton
                    field="description"
                    label="Deskripsi singkat"
                    currentValue={profileEdit.description}
                    onApply={(text) =>
                      setProfileEdit((p) => ({ ...p, description: text }))
                    }
                  />
                </div>
                <Textarea
                  id="si-desc"
                  rows={2}
                  value={profileEdit.description}
                  onChange={(e) => setProfileEdit((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">FAQ ({includedFaq} dari {faqItems.length} akan disimpan)</p>
                {faqItems.length === 0 ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowReview(false)}>
                    Kembali chat untuk tambah FAQ
                  </Button>
                ) : null}
              </div>
              {faqItems.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  Belum ada draft FAQ. Lanjutkan percakapan atau ketik &quot;Cukup, lanjut review&quot; setelah
                  menjawab pertanyaan kebijakan.
                </p>
              ) : (
                <ul className="space-y-3">
                  {faqItems.map((item, idx) => (
                    <li key={`faq-${idx}`} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.include}
                          onChange={(e) =>
                            setFaqItems((prev) =>
                              prev.map((f, i) => (i === idx ? { ...f, include: e.target.checked } : f)),
                            )
                          }
                          aria-label="Sertakan FAQ"
                          className="mt-1 h-4 w-4"
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Input
                            value={item.question}
                            onChange={(e) =>
                              setFaqItems((prev) =>
                                prev.map((f, i) => (i === idx ? { ...f, question: e.target.value } : f)),
                              )
                            }
                            aria-label="Pertanyaan FAQ"
                          />
                          <Textarea
                            rows={2}
                            value={item.answer}
                            onChange={(e) =>
                              setFaqItems((prev) =>
                                prev.map((f, i) => (i === idx ? { ...f, answer: e.target.value } : f)),
                              )
                            }
                            aria-label="Jawaban FAQ"
                          />
                          {item.category ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {item.category}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              className={cn(
                "rounded-lg border p-4",
                canPublish ? "border-primary/40 bg-primary/5" : "border-dashed bg-muted/30",
              )}
            >
              {!canPublish ? (
                <p className="mb-3 text-sm text-muted-foreground">
                  Lengkapi produk/jasa, area kirim, dan centang minimal satu FAQ untuk publish.
                </p>
              ) : (
                <p className="mb-3 text-sm font-medium text-primary">
                  Siap disimpan — profil toko dan {includedFaq} FAQ akan masuk ke sistem.
                </p>
              )}
              <Button
                type="button"
                size="lg"
                className={cn("w-full sm:w-auto", canPublish && "ring-2 ring-primary/30 ring-offset-2")}
                disabled={!canPublish}
                onClick={() => publishMut.mutate()}
              >
                {publishMut.isPending ? "Menyimpan…" : "Publish profil & FAQ"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
