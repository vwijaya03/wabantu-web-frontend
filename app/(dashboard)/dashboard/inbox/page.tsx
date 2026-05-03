"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Input } from "@/components/ui/input";
import { inboxApi } from "@/lib/api/inbox";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function InboxPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const convosQuery = useQuery({
    queryKey: ["inbox-conversations", search, unreadOnly],
    queryFn: () => inboxApi.list({ search, unreadOnly }),
    refetchInterval: 5000,
  });
  const conversations = convosQuery.data ?? [];
  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? conversations[0] ?? null,
    [conversations, selectedId],
  );

  const messagesQuery = useQuery({
    queryKey: ["inbox-messages", selectedConversation?.id],
    queryFn: () =>
      selectedConversation ? inboxApi.messages(selectedConversation.id) : Promise.resolve([]),
    enabled: Boolean(selectedConversation?.id),
    refetchInterval: 4000,
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
    await qc.invalidateQueries({ queryKey: ["inbox-messages"] });
  };

  const handoffMut = useMutation({
    mutationFn: async () => {
      if (!selectedConversation) return;
      if (selectedConversation.aiHandled) {
        await inboxApi.handoff(selectedConversation.id, "Takeover manual dari inbox");
      } else {
        await inboxApi.resumeAi(selectedConversation.id);
      }
    },
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(toApiError(e).message),
  });

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!selectedConversation || !draft.trim()) return;
      await inboxApi.sendMessage(selectedConversation.id, draft.trim());
      setDraft("");
    },
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(toApiError(e).message),
  });

  const unreadCount = conversations.reduce((n, c) => n + c.unreadCount, 0);

  useEffect(() => {
    if (!selectedConversation || selectedConversation.unreadCount <= 0) return;
    void inboxApi.markAsRead(selectedConversation.id).then(() => {
      void qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
    });
  }, [qc, selectedConversation]);

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Semua percakapan WhatsApp pelanggan dalam satu layar."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={unreadCount > 0 ? "warning" : "outline"}>
              {unreadCount} belum dibaca
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnreadOnly((v) => !v)}
            >
              {unreadOnly ? "Semua chat" : "Hanya unread"}
            </Button>
          </div>
        }
      />
      <Card className="overflow-hidden">
        <div className="grid h-[600px] grid-cols-1 lg:grid-cols-[300px_1fr]">
          <div className="flex flex-col border-r bg-muted/30">
            <div className="border-b p-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, nomor, isi chat..."
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">
                  {convosQuery.isLoading
                    ? "Memuat percakapan..."
                    : "Belum ada percakapan masuk."}
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-md border p-2 text-left transition ${
                        selectedConversation?.id === item.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium">
                          {item.contact.displayName || item.contact.phoneNumber}
                        </p>
                        {item.unreadCount > 0 && (
                          <Badge variant="warning">{item.unreadCount}</Badge>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {item.lastMessagePreview || "Belum ada pesan"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {!selectedConversation ? (
            <CardContent className="flex flex-col items-center justify-center gap-2 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-medium">Pilih percakapan</p>
              <p className="text-xs text-muted-foreground">
                Atau biarkan AI yang membalas otomatis sesuai konteks bisnis.
              </p>
            </CardContent>
          ) : (
            <div className="flex min-h-0 flex-col">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">
                    {selectedConversation.contact.displayName ||
                      selectedConversation.contact.phoneNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.contact.phoneNumber}
                  </p>
                </div>
                <Button
                  variant={selectedConversation.aiHandled ? "outline" : "default"}
                  size="sm"
                  onClick={() => handoffMut.mutate()}
                  disabled={handoffMut.isPending}
                >
                  {selectedConversation.aiHandled ? "Take over manual" : "Lanjut AI"}
                </Button>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {(messagesQuery.data ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${
                      m.direction === "out"
                        ? "ml-auto bg-primary/10"
                        : "bg-background text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body || "(pesan non-text)"}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {m.author} · {new Date(m.createdAt).toLocaleTimeString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t p-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ketik balasan manual..."
                />
                <Button
                  size="icon"
                  onClick={() => sendMut.mutate()}
                  disabled={sendMut.isPending || !draft.trim()}
                  aria-label="Kirim pesan"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
