"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Circle, Loader2, MessageSquare, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Input } from "@/components/ui/input";
import {
  INBOX_UNREAD_QUERY_KEY,
  inboxApi,
  type InboxConversation,
} from "@/lib/api/inbox";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

const CONVO_PAGE = 30;
/** Message thread page size (server clamps 1–100). */
const MSG_PAGE = 10;

/** Throttle scroll-triggered “load older” to avoid duplicate fetches. */
const SCROLL_LOAD_OLDER_MS = 450;
const SCROLL_TOP_THRESHOLD_PX = 72;

function useDebouncedValue<T>(value: T, ms: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return d;
}

export default function InboxPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [draft, setDraft] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const unreadSummaryQuery = useQuery({
    queryKey: INBOX_UNREAD_QUERY_KEY,
    queryFn: () => inboxApi.unreadSummary(),
    staleTime: Number.POSITIVE_INFINITY,
    /** SSE is primary; this still refreshes when the tab regains focus if push failed. */
    refetchOnWindowFocus: "always",
  });
  const totalUnread = unreadSummaryQuery.data?.totalUnreadMessages ?? 0;

  const convosInfinite = useInfiniteQuery({
    queryKey: ["inbox-conversations", debouncedSearch, unreadOnly],
    queryFn: ({ pageParam }) =>
      inboxApi.listPage({
        search: debouncedSearch || undefined,
        unreadOnly,
        limit: CONVO_PAGE,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: "always",
  });

  const conversations = useMemo(
    () => convosInfinite.data?.pages.flatMap((p) => p.items) ?? [],
    [convosInfinite.data],
  );

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const messagesInfinite = useInfiniteQuery({
    queryKey: ["inbox-messages", selectedId, MSG_PAGE],
    queryFn: ({ pageParam }) =>
      inboxApi.messagesPage(selectedId!, {
        limit: MSG_PAGE,
        cursor:
          typeof pageParam === "string" && pageParam.length > 0
            ? pageParam
            : undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(selectedId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: "always",
  });

  const messages = useMemo(() => {
    const pages = messagesInfinite.data?.pages ?? [];
    const merged = pages.slice().reverse().flatMap((p) => p.messages);
    const byId = new Map(merged.map((m) => [m.id, m]));
    return [...byId.values()].sort((a, b) => {
      const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    });
  }, [messagesInfinite.data]);

  const { isFetchingNextPage: isFetchingOlderMessages, isPending: messagesPending } =
    messagesInfinite;

  const scrollRef = useRef<HTMLDivElement>(null);
  const convoScrollRef = useRef<HTMLDivElement>(null);
  const convoSentinelRef = useRef<HTMLDivElement>(null);
  const msgTopSentinelRef = useRef<HTMLDivElement>(null);
  const lastScrolledConvoRef = useRef<string | null>(null);
  const lastScrollLoadOlderAt = useRef(0);
  const messagesInfiniteRef = useRef(messagesInfinite);
  messagesInfiniteRef.current = messagesInfinite;
  /** Drop piled-up message pages when leaving a thread so returning starts at MSG_PAGE again. */
  const prevMessagesConvoIdRef = useRef<string | null>(null);

  useEffect(() => {
    lastScrolledConvoRef.current = null;
  }, [selectedId]);

  useEffect(() => {
    const prev = prevMessagesConvoIdRef.current;
    prevMessagesConvoIdRef.current = selectedId;
    if (prev && prev !== selectedId) {
      void qc.removeQueries({ queryKey: ["inbox-messages", prev, MSG_PAGE] });
    }
  }, [selectedId, qc]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !selectedId || messages.length === 0) return;
    if (lastScrolledConvoRef.current !== selectedId) {
      el.scrollTop = el.scrollHeight;
      lastScrolledConvoRef.current = selectedId;
    }
  }, [selectedId, messages.length]);

  const preserveScrollAfterPrepend = useCallback((scrollEl: HTMLDivElement) => {
    const prevHeight = scrollEl.scrollHeight;
    const prevScrollTop = scrollEl.scrollTop;
    return () => {
      const apply = () => {
        const n = scrollRef.current;
        if (!n) return;
        const delta = n.scrollHeight - prevHeight;
        n.scrollTop = prevScrollTop + delta;
      };
      requestAnimationFrame(() => requestAnimationFrame(apply));
    };
  }, []);

  const tryLoadOlderMessages = useCallback(
    (reason: "scroll" | "intersection") => {
      const mi = messagesInfiniteRef.current;
      if (!mi.hasNextPage || mi.isFetchingNextPage) return;
      const el = scrollRef.current;
      if (!el) return;

      if (reason === "scroll") {
        const now = Date.now();
        if (now - lastScrollLoadOlderAt.current < SCROLL_LOAD_OLDER_MS) return;
        lastScrollLoadOlderAt.current = now;
        if (el.scrollTop > SCROLL_TOP_THRESHOLD_PX) return;
      }

      const donePreserve = preserveScrollAfterPrepend(el);
      void mi.fetchNextPage().then(donePreserve);
    },
    [preserveScrollAfterPrepend],
  );

  const onMessagesScroll = useCallback(
    (_e: UIEvent<HTMLDivElement>) => {
      tryLoadOlderMessages("scroll");
    },
    [tryLoadOlderMessages],
  );

  useEffect(() => {
    const root = scrollRef.current;
    const target = msgTopSentinelRef.current;
    if (!root || !target || !selectedId) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) tryLoadOlderMessages("intersection");
      },
      { root, rootMargin: "160px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [selectedId, tryLoadOlderMessages, messages.length]);

  useEffect(() => {
    const root = convoScrollRef.current;
    const target = convoSentinelRef.current;
    if (!root || !target) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          convosInfinite.hasNextPage &&
          !convosInfinite.isFetchingNextPage
        ) {
          void convosInfinite.fetchNextPage();
        }
      },
      { root, rootMargin: "80px", threshold: 0 },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [
    convosInfinite.fetchNextPage,
    convosInfinite.hasNextPage,
    convosInfinite.isFetchingNextPage,
    conversations.length,
  ]);

  const invalidateAll = async () => {
    await qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
    await qc.invalidateQueries({ queryKey: ["inbox-messages"] });
    await qc.invalidateQueries({ queryKey: INBOX_UNREAD_QUERY_KEY });
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
    onSuccess: () => void invalidateAll(),
    onError: (e) => toast.error(toApiError(e).message),
  });

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!selectedConversation || !draft.trim()) return;
      await inboxApi.sendMessage(selectedConversation.id, draft.trim());
      setDraft("");
    },
    onSuccess: () => void invalidateAll(),
    onError: (e) => toast.error(toApiError(e).message),
  });

  useEffect(() => {
    if (!selectedId || !selectedConversation || selectedConversation.unreadCount <= 0) {
      return;
    }
    void inboxApi.markAsRead(selectedId).then(() => {
      void qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      void qc.invalidateQueries({ queryKey: INBOX_UNREAD_QUERY_KEY });
    });
  }, [qc, selectedId, selectedConversation?.id, selectedConversation?.unreadCount]);

  const onSelectConversation = (c: InboxConversation) => {
    setSelectedId(c.id);
  };

  const onDraftKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (!draft.trim() || sendMut.isPending) return;
    sendMut.mutate();
  };

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Semua percakapan WhatsApp pelanggan dalam satu layar."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={totalUnread > 0 ? "warning" : "outline"}>
              {totalUnread} belum dibaca
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
          <div className="flex min-h-0 flex-col border-r bg-muted/30">
            <div className="border-b p-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, nomor, isi chat..."
              />
            </div>
            <div
              ref={convoScrollRef}
              className="min-h-0 flex-1 overflow-y-auto p-2"
            >
              {convosInfinite.isLoading && conversations.length === 0 ? (
                <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat percakapan...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">
                  Belum ada percakapan masuk.
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((item) => {
                    const unread = item.unreadCount > 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectConversation(item)}
                        className={`relative w-full rounded-md border p-2 text-left transition ${
                          selectedId === item.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-background"
                        } ${unread && selectedId !== item.id ? "border-l-4 border-l-primary" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {unread ? (
                              <Circle
                                className="h-2 w-2 shrink-0 fill-primary text-primary"
                                aria-hidden
                              />
                            ) : (
                              <span className="w-2 shrink-0" aria-hidden />
                            )}
                            <p className="line-clamp-1 text-sm font-medium">
                              {item.contact.displayName || item.contact.phoneNumber}
                            </p>
                          </div>
                          {unread ? (
                            <Badge variant="warning" className="shrink-0">
                              {item.unreadCount}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-1 pl-4 text-xs text-muted-foreground">
                          {item.lastMessagePreview || "Belum ada pesan"}
                        </p>
                      </button>
                    );
                  })}
                  <div ref={convoSentinelRef} className="h-2" aria-hidden />
                  {convosInfinite.isFetchingNextPage ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          {!selectedConversation ? (
            <CardContent className="flex flex-col items-center justify-center gap-2 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-medium">Pilih percakapan</p>
              <p className="text-xs text-muted-foreground">
                Pilih chat di kiri untuk melihat pesan. Belum terbaca sampai Anda membukanya.
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
              <div
                ref={scrollRef}
                role="log"
                aria-label="Riwayat pesan"
                aria-busy={isFetchingOlderMessages || messagesPending}
                onScroll={onMessagesScroll}
                className="relative min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
              >
                {isFetchingOlderMessages && messages.length > 0 ? (
                  <div
                    className="pointer-events-none absolute left-4 right-4 top-2 z-10 flex justify-center"
                    aria-live="polite"
                  >
                    <div className="flex items-center gap-2 rounded-md border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      Memuat pesan lama…
                    </div>
                  </div>
                ) : null}
                <div
                  ref={msgTopSentinelRef}
                  className="min-h-8 w-full shrink-0"
                  aria-hidden
                />
                {(isFetchingOlderMessages || messagesPending) && messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Memuat pesan…
                  </div>
                ) : null}
                {!isFetchingOlderMessages &&
                messages.length > 0 &&
                messagesInfinite.hasNextPage === false ? (
                  <p className="text-center text-[11px] text-muted-foreground">
                    Awal percakapan
                  </p>
                ) : null}
                {messages.map((m) => (
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
                  onKeyDown={onDraftKeyDown}
                  placeholder="Ketik balasan manual… (Enter kirim)"
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
