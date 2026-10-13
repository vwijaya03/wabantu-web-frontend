"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ImageUp, Loader2, RotateCcw, Send } from "lucide-react";
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
import { hasTenantDashboardAccess } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
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

function SimBubble({ m }: { m: SimMessage }) {
  const out = m.direction === "outbound";
  const author = (["contact", "ai", "human", "system"].includes(m.author) ? m.author : "human") as
    | "contact"
    | "ai"
    | "human"
    | "system";
  if (m.type === "image") {
    return (
      <div className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${out ? "ml-auto bg-primary/10" : "bg-background"}`}>
        <p className="flex items-center gap-1 text-muted-foreground">
          <ImageUp className="h-4 w-4" /> {m.text || "[gambar]"}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {m.author} · {new Date(m.createdAt).toLocaleTimeString("id-ID")}
        </p>
      </div>
    );
  }
  return (
    <InboxMessageBubble
      message={{
        id: m.id,
        conversationId: "simulator",
        externalId: null,
        direction: out ? "out" : "in",
        author,
        type: "text",
        body: m.text,
        media: null,
        linkedOrderId: null,
        status: m.status === "failed" ? "failed" : "sent",
        createdAt: m.createdAt,
      }}
    />
  );
}

export default function SimulatorPage() {
  const { user } = useAuth();
  const allowed = hasTenantDashboardAccess(user);
  const [kind, setKind] = useState<BuyerKind>("reseller");
  const [sessionId, setSessionId] = useState<string>(RESELLER_SESSION);
  const [buyerName, setBuyerName] = useState("");
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery({
    queryKey: ["simulator", "messages", sessionId],
    queryFn: () => simulatorApi.list(sessionId),
    enabled: allowed,
    refetchInterval: (q) => (q.state.status === "error" ? false : 1500),
    retry: false,
  });
  const messages = messagesQuery.data?.messages ?? [];
  const last = messages[messages.length - 1];
  const waitingReply = Boolean(last && last.direction === "inbound");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMut = useMutation({
    mutationFn: (req: Omit<SimSendRequest, "sessionId" | "buyerName">) =>
      simulatorApi.send({ ...req, sessionId, buyerName: buyerName.trim() || undefined }),
    onSuccess: () => {
      setText("");
      void messagesQuery.refetch();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (!allowed) {
    return (
      <div className="p-6">
        <PageHeader title="Simulator Chat" description="Untuk owner/staff tenant, atau super admin saat impersonate." />
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
    if (!(SIM_IMAGE_MIME as readonly string[]).includes(f.type)) return toast.error("Format gambar harus JPEG, PNG, atau WebP.");
    if (f.size > SIM_MAX_IMAGE_BYTES) return toast.error("Ukuran gambar maksimal 2 MB.");
    const base64 = await fileToBase64(f);
    sendMut.mutate({ image: { base64, mimeType: f.type as SimImageMime }, text: text.trim() || undefined });
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Simulator Chat"
        description="Chat seperti di WhatsApp lewat pipeline yang sama, tanpa mengirim ke Meta. Harga mengikuti tingkat harga pembeli dari katalog."
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Pembeli</CardTitle>
            {tenantName && <Badge variant="outline">Tenant: {tenantName}</Badge>}
            <Badge>{kind === "reseller" ? "Harga reseller" : "Harga umum"}</Badge>
          </div>
          <CardDescription>
            Sesi &quot;reseller-demo&quot; terhubung ke kontak reseller di data demo; sesi lain dianggap pembeli umum.
            Tingkat harga ditentukan backend, bukan dari halaman ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <div className="space-y-1">
            <Label>Jenis pembeli</Label>
            <Select value={kind} onValueChange={(v) => switchKind(v as BuyerKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reseller">Reseller demo (reseller-demo)</SelectItem>
                <SelectItem value="umum">Pembeli umum (sesi baru)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Nama pembeli (opsional)</Label>
            <Input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              maxLength={SIM_MAX_BUYER_NAME}
              placeholder="Pembeli Demo"
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

      {messagesQuery.isError && (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Percakapan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex max-h-[60vh] min-h-48 flex-col gap-3 overflow-y-auto rounded-md border bg-muted/20 p-3">
            {messagesQuery.isLoading ? (
              <Loader2 className="m-auto h-5 w-5 animate-spin" />
            ) : messages.length === 0 ? (
              <p className="m-auto text-sm text-muted-foreground">Belum ada pesan. Mulai chat sebagai pembeli.</p>
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
              placeholder="Ketik pesan (juga dipakai sebagai caption gambar)…"
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
            Status order & hasil cek bukti transfer dilihat dan disetujui owner di halaman Pesanan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
