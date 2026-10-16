"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ImageUp, Loader2, Radio, RefreshCw, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/dashboard/page-header";
import { InboxMessageBubble } from "@/components/inbox/inbox-message-bubble";
import { useAuth } from "@/components/providers/auth-provider";
import { useRealtimeCollection } from "@/hooks/use-realtime-collection";
import { FIRESTORE_MESSAGES_ORDER_FIELD, firestorePaths } from "@/lib/firebase/paths";
import { canPerformOwnerActions, hasTenantDashboardAccess } from "@/lib/api/auth";
import { SimulatorOrderPanel } from "@/components/simulator/simulator-order-panel";
import { toApiError } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n/locale";
import {
  SIM_IMAGE_MIME,
  SIM_MAX_BUYER_NAME,
  SIM_MAX_IMAGE_BYTES,
  SIM_MAX_TEXT,
  fileToBase64,
  newSimSessionId,
  simulatorApi,
  type SimImageMime,
  type SimMessage,
  type SimMessagesResponse,
  type SimSendRequest,
} from "@/lib/api/simulator";

/** Seed demo backend: sessionId "reseller-demo" terhubung ke kontak reseller; sesi lain = pembeli umum. */
const RESELLER_SESSION = "reseller-demo";
type BuyerKind = "reseller" | "umum";

function errorMessage(err: unknown): string {
  const e = toApiError(err);
  if (e.status === 429) return "Batas simulator tercapai (20 pesan/menit per tenant). Tunggu sebentar lalu coba lagi.";
  if (e.status === 403) return "Tidak ada akses: buka simulator sebagai owner/staff, atau super admin saat impersonate tenant.";
  if (e.status === 404) return "Endpoint belum tersedia di backend yang terhubung.";
  return e.message;
}

/** TODO(BE): bentuk dokumen Firestore belum final; diasumsikan sama dengan item GET /simulator/messages. */
function docToSimMessage(id: string, d: Record<string, unknown>): SimMessage | null {
  const createdAt = d.createdAt as { toDate?: () => Date } | string | undefined;
  const iso =
    typeof createdAt === "string" ? createdAt : createdAt?.toDate ? createdAt.toDate().toISOString() : null;
  if (!iso || (d.direction !== "inbound" && d.direction !== "outbound")) return null;
  return {
    id,
    direction: d.direction,
    author: typeof d.author === "string" ? d.author : "system",
    type: d.type === "image" ? "image" : "text",
    text: typeof d.text === "string" ? d.text : "",
    createdAt: iso,
    status: typeof d.status === "string" ? d.status : "sent",
    imageUrl: typeof d.imageUrl === "string" ? d.imageUrl : null,
  };
}

function SimBubble({ m }: { m: SimMessage }) {
  const out = m.direction === "outbound";
  const author = (["contact", "ai", "human", "system"].includes(m.author) ? m.author : "human") as
    | "contact"
    | "ai"
    | "human"
    | "system";
  return (
    <InboxMessageBubble
      message={{
        id: m.id,
        conversationId: "simulator",
        externalId: null,
        direction: out ? "out" : "in",
        author,
        type: m.type === "image" && m.imageUrl ? "image" : "text",
        body: m.type === "image" && m.text === "[gambar]" ? null : m.text,
        // URL backend = /inbox/messages/:id/media; bubble memuatnya lewat inboxApi (Bearer).
        media: m.type === "image" && m.imageUrl ? { url: m.imageUrl } : null,
        linkedOrderId: null,
        status: m.status === "failed" ? "failed" : "sent",
        createdAt: m.createdAt,
      }}
    />
  );
}

export default function SimulatorPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const allowed = hasTenantDashboardAccess(user);
  const [kind, setKind] = useState<BuyerKind>("reseller");
  const [sessionId, setSessionId] = useState<string>(RESELLER_SESSION);
  const [buyerName, setBuyerName] = useState("");
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const qc = useQueryClient();
  // conversationId dari respons POST/GET; dikunci per sessionId.
  const [conv, setConv] = useState<{ sessionId: string; id: string } | null>(null);
  const conversationId = conv && conv.sessionId === sessionId ? conv.id : null;
  const stateKey = ["simulator", "state", sessionId] as const;
  const messagesQuery = useRealtimeCollection<SimMessage>({
    queryKey: ["simulator", "messages", sessionId],
    path: conversationId ? (tenantId) => firestorePaths.simMessages(tenantId, conversationId) : null,
    pathKey: conversationId,
    orderField: FIRESTORE_MESSAGES_ORDER_FIELD,
    mapDoc: docToSimMessage,
    poll: async () => {
      const r = await simulatorApi.list(sessionId);
      qc.setQueryData<SimMessagesResponse>(stateKey, r);
      if (r.conversationId) setConv({ sessionId, id: r.conversationId });
      return r.messages;
    },
    enabled: allowed,
  });
  const messages = messagesQuery.items;
  // pricing/order hanya dari REST. Saat polling sudah terisi oleh poll di atas; saat realtime di-refresh tiap 3 dtk.
  const stateQuery = useQuery({
    queryKey: stateKey,
    queryFn: () => simulatorApi.list(sessionId),
    enabled: allowed && messagesQuery.mode === "realtime",
    refetchInterval: 3000,
    retry: false,
  });
  const pricing = stateQuery.data?.pricing;
  const order = stateQuery.data?.order;
  const last = messages[messages.length - 1];
  const waitingReply = Boolean(last && last.direction === "inbound");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMut = useMutation({
    mutationFn: (req: Omit<SimSendRequest, "sessionId" | "buyerName">) =>
      simulatorApi.send({ ...req, sessionId, buyerName: buyerName.trim() || undefined }),
    onSuccess: (r) => {
      setText("");
      if (r.conversationId) setConv({ sessionId, id: r.conversationId });
      void messagesQuery.refetch();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (!allowed) {
    return (
      <div className="p-6">
        <PageHeader title={t("Simulator Chat")} description={t("Untuk owner/staff tenant, atau super admin saat impersonate.")} />
        <p className="text-sm text-muted-foreground">
          Pilih/impersonate tenant dulu (mis. &quot;Toko Demo WABantu&quot;) untuk memakai simulator.
        </p>
      </div>
    );
  }

  const tenantName = user?.impersonation?.tenant?.name ?? user?.tenant?.name;

  const switchKind = (k: BuyerKind) => {
    setKind(k);
    setSessionId(k === "reseller" ? RESELLER_SESSION : newSimSessionId());
  };

  const onPickFile = async (f: File | undefined) => {
    if (!f) return;
    if (!(SIM_IMAGE_MIME as readonly string[]).includes(f.type)) return toast.error(t("Format gambar harus JPEG, PNG, atau WebP."));
    if (f.size > SIM_MAX_IMAGE_BYTES) return toast.error(t("Ukuran gambar maksimal 2 MB."));
    const base64 = await fileToBase64(f);
    sendMut.mutate({ image: { base64, mimeType: f.type as SimImageMime }, text: text.trim() || undefined });
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("Simulator Chat")}
        description={t("Chat seperti di WhatsApp lewat pipeline yang sama, tanpa mengirim ke Meta. Harga mengikuti tingkat harga pembeli dari katalog.")}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Pembeli</CardTitle>
            {tenantName && <Badge variant="outline">Tenant: {tenantName}</Badge>}
            {pricing ? (
              <Badge>Tingkat: {pricing.tierLabel || pricing.tier}</Badge>
            ) : (
              <Badge variant="outline">{t("Tingkat harga: menunggu pesan pertama")}</Badge>
            )}
          </div>
          <CardDescription>
            Sesi &quot;reseller-demo&quot; terhubung ke kontak reseller di data demo; sesi lain dianggap pembeli umum.
            Tingkat harga ditentukan backend dari data kontak, bukan dari halaman ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <div className="space-y-1">
            <Label>{t("Jenis pembeli")}</Label>
            <Select value={kind} onValueChange={(v) => switchKind(v as BuyerKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reseller">{t("Reseller demo (reseller-demo)")}</SelectItem>
                <SelectItem value="umum">{t("Pembeli umum (sesi baru)")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("Nama pembeli (opsional)")}</Label>
            <Input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              maxLength={SIM_MAX_BUYER_NAME}
              placeholder={t("Pembeli Demo")}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => (kind === "umum" ? setSessionId(newSimSessionId()) : void messagesQuery.refetch())}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {kind === "umum" ? "Sesi baru" : "Muat ulang"}
          </Button>
          <p className="text-xs text-muted-foreground sm:col-span-3">Session ID: {sessionId}</p>
        </CardContent>
      </Card>

      {messagesQuery.error && (
        <Card className="border-amber-500/50">
          <CardContent className="flex gap-2 pt-6 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{errorMessage(messagesQuery.error)}</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => void messagesQuery.refetch()}>
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Percakapan</CardTitle>
            {messagesQuery.mode === "realtime" ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                <Radio className="mr-1 h-3 w-3" /> Realtime
              </Badge>
            ) : messagesQuery.mode === "connecting" ? (
              <Badge variant="outline">Menyambung…</Badge>
            ) : (
              <Badge variant="secondary" title={messagesQuery.reason ?? undefined}>
                <RefreshCw className="mr-1 h-3 w-3" /> Polling
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex max-h-[60vh] min-h-48 flex-col gap-3 overflow-y-auto rounded-md border bg-muted/20 p-3">
            {messagesQuery.isLoading ? (
              <Loader2 className="m-auto h-5 w-5 animate-spin" />
            ) : messages.length === 0 ? (
              <p className="m-auto text-sm text-muted-foreground">{t("Belum ada pesan. Mulai chat sebagai pembeli.")}</p>
            ) : (
              messages.map((m) => <SimBubble key={m.id} m={m} />)
            )}
            {(waitingReply || sendMut.isPending) && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Menunggu balasan bot…
              </p>
            )}
            <div ref={bottomRef} />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const t = text.trim();
              if (t) sendMut.mutate({ text: t });
            }}
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("Ketik pesan (juga dipakai sebagai caption gambar)…")}
              maxLength={SIM_MAX_TEXT}
              disabled={sendMut.isPending}
            />
            <Button type="submit" disabled={sendMut.isPending || !text.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Kirim</span>
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept={SIM_IMAGE_MIME.join(",")}
              className="hidden"
              onChange={(e) => {
                void onPickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" disabled={sendMut.isPending} onClick={() => fileRef.current?.click()}>
              <ImageUp className="mr-2 h-4 w-4" />
              Bukti transfer
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Status order & hasil cek bukti transfer tampil di panel Pesanan; persetujuan owner memakai endpoint order.
          </p>
        </CardContent>
      </Card>
      <SimulatorOrderPanel
        order={order}
        pricing={pricing}
        canApprove={canPerformOwnerActions(user)}
        readOnly={Boolean(user?.impersonation?.active)}
        onChanged={() => void qc.invalidateQueries({ queryKey: stateKey })}
      />
      </div>
    </div>
  );
}
