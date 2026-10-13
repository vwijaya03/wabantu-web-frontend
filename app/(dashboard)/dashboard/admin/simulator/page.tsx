"use client";

import { useRef, useState } from "react";
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
import { toApiError } from "@/lib/api/client";
import { simulatorApi, type SimulatorMessage } from "@/lib/api/simulator";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function EndpointMissing({ error }: { error: unknown }) {
  return (
    <Card className="border-amber-500/50">
      <CardContent className="flex gap-2 pt-6 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <span>
          Endpoint belum tersedia: API simulator di backend belum ada ({toApiError(error).message}). Simulator
          tidak bisa dipakai sampai backend siap; tidak ada data contoh yang ditampilkan.
        </span>
      </CardContent>
    </Card>
  );
}

function SimMessage({ m }: { m: SimulatorMessage }) {
  return (
    <div className="space-y-1">
      {m.type === "image" ? (
        <div className="ml-auto max-w-[85%] rounded-lg border bg-primary/10 px-3 py-2 text-sm">
          {m.body || "Bukti transfer terkirim"}
        </div>
      ) : (
        <InboxMessageBubble
          message={{
            id: m.id,
            conversationId: "simulator",
            externalId: null,
            // Perspektif owner: pesan reseller = "in", balasan bot = "out".
            direction: m.direction,
            author: m.author,
            type: "text",
            body: m.body,
            media: null,
            linkedOrderId: null,
            status: "sent",
            createdAt: m.createdAt,
          }}
        />
      )}
      {m.quote && m.quote.length > 0 && (
        <div className="ml-auto max-w-[85%] rounded-md border bg-muted/40 px-3 py-2 text-xs">
          <p className="mb-1 font-medium">Harga dikutip</p>
          {m.quote.map((q, i) => (
            <p key={i}>
              {q.productName} × {q.qty} @ {rupiah.format(q.unitPrice)}{" "}
              <Badge variant="outline" className="ml-1">
                {q.tier}
              </Badge>
            </p>
          ))}
        </div>
      )}
      {m.orderId && (
        <p className="text-right text-[11px] text-muted-foreground">
          Order {m.orderId}
          {m.orderStatus ? ` · ${m.orderStatus}` : ""}
        </p>
      )}
    </div>
  );
}

export default function SimulatorPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [tenantId, setTenantId] = useState<string>("");
  const [resellerId, setResellerId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SimulatorMessage[]>([]);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const tenantsQuery = useQuery({
    queryKey: ["admin", "simulator", "tenants"],
    queryFn: simulatorApi.listTenants,
    enabled: isSuperAdmin,
    retry: false,
  });
  const resellersQuery = useQuery({
    queryKey: ["admin", "simulator", "resellers", tenantId],
    queryFn: () => simulatorApi.listResellers(tenantId),
    enabled: isSuperAdmin && Boolean(tenantId),
    retry: false,
  });

  const append = (msgs: SimulatorMessage[]) => setMessages((prev) => [...prev, ...msgs]);
  const onErr = (err: unknown) => toast.error(toApiError(err).message);

  const startMut = useMutation({
    mutationFn: () => simulatorApi.startSession(tenantId, resellerId),
    onSuccess: (s) => {
      setSessionId(s.sessionId);
      setMessages(s.messages ?? []);
    },
    onError: onErr,
  });
  const sendMut = useMutation({
    mutationFn: (t: string) => simulatorApi.sendMessage(sessionId as string, t),
    onSuccess: (r) => {
      setText("");
      append(r.messages);
    },
    onError: onErr,
  });
  const proofMut = useMutation({
    mutationFn: (f: File) => simulatorApi.uploadProof(sessionId as string, f),
    onSuccess: (r) => append(r.messages),
    onError: onErr,
  });

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <PageHeader title="Simulator Chat" description="Hanya untuk super admin platform." />
        <p className="text-sm text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  const reseller = resellersQuery.data?.resellers.find((r) => r.id === resellerId);
  const busy = sendMut.isPending || proofMut.isPending;

  const onPickFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("File harus berupa gambar.");
    if (f.size > MAX_PROOF_BYTES) return toast.error("Ukuran gambar maksimal 5 MB.");
    proofMut.mutate(f);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Simulator Chat"
        description="Chat sebagai reseller demo: pesan dengan harga tingkatnya, kirim bukti transfer, lalu owner menyetujui."
      />

      {tenantsQuery.isError ? (
        <EndpointMissing error={tenantsQuery.error} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pilih tenant & reseller</CardTitle>
            <CardDescription>Memulai sesi baru akan mengosongkan percakapan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 sm:items-end">
            <div className="space-y-1">
              <Label>Tenant demo</Label>
              <Select
                value={tenantId}
                onValueChange={(v) => {
                  setTenantId(v);
                  setResellerId("");
                  setSessionId(null);
                  setMessages([]);
                }}
                disabled={tenantsQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tenantsQuery.isLoading ? "Memuat…" : "Pilih tenant"} />
                </SelectTrigger>
                <SelectContent>
                  {(tenantsQuery.data?.tenants ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reseller (tingkat harga)</Label>
              <Select value={resellerId} onValueChange={setResellerId} disabled={!tenantId || resellersQuery.isError}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih reseller" />
                </SelectTrigger>
                <SelectContent>
                  {(resellersQuery.data?.resellers ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} — {r.tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => startMut.mutate()} disabled={!tenantId || !resellerId || startMut.isPending}>
              {startMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Mulai sesi baru
            </Button>
            {resellersQuery.isError && (
              <div className="sm:col-span-3">
                <EndpointMissing error={resellersQuery.error} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {sessionId && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">Percakapan</CardTitle>
              {reseller && <Badge>Tingkat: {reseller.tier}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex max-h-[60vh] min-h-48 flex-col gap-3 overflow-y-auto rounded-md border bg-muted/20 p-3">
              {messages.length === 0 ? (
                <p className="m-auto text-sm text-muted-foreground">Belum ada pesan. Mulai chat sebagai reseller.</p>
              ) : (
                messages.map((m) => <SimMessage key={m.id} m={m} />)
              )}
              {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const t = text.trim();
                if (t) sendMut.mutate(t);
              }}
            >
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ketik pesan sebagai reseller…" maxLength={2000} disabled={busy} />
              <Button type="submit" disabled={busy || !text.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Kirim</span>
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  onPickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
                <ImageUp className="mr-2 h-4 w-4" />
                Bukti transfer
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
