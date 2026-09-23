"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { chatWidgetApi, type ChatMessage } from "@/lib/api/chat-widget";
import { resolveManifestTheme } from "@/lib/template-engine/resolve-manifest";
import type { TemplateManifestV1 } from "@/lib/template-engine/types";
import { templatesApi } from "@/lib/api/templates";

type Props = {
  tenantSlug: string;
};

export function ChatEmbedRuntime({ tenantSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<Awaited<ReturnType<typeof chatWidgetApi.publicConfig>> | null>(null);
  const [manifest, setManifest] = useState<TemplateManifestV1 | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [visitorToken, setVisitorToken] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const themeStyle = useMemo(() => resolveManifestTheme(manifest).style, [manifest]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await chatWidgetApi.publicConfig(tenantSlug);
        if (cancelled) return;
        setConfig(cfg);
        if (!cfg.enabled) {
          setError("Chat belum diaktifkan untuk toko ini.");
          return;
        }
        const tpl = await templatesApi.get("platform-chat-minimal");
        if (!cancelled) {
          const base = tpl.manifest as TemplateManifestV1;
          if (cfg.tokens && typeof cfg.tokens === "object") {
            setManifest({ ...base, tokens: { ...base.tokens, ...(cfg.tokens as object) } });
          } else {
            setManifest(base);
          }
        }
        const sess = await chatWidgetApi.createSession(tenantSlug);
        if (cancelled) return;
        setSessionId(sess.sessionId);
        setVisitorToken(sess.visitorToken);
        if (sess.welcomeMessage) {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              body: sess.welcomeMessage,
              contentType: "text",
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal memuat chat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !sessionId || !visitorToken || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await chatWidgetApi.postMessage(tenantSlug, sessionId, text, visitorToken);
      setMessages((prev) => [
        ...prev,
        {
          id: res.visitor.id,
          role: "visitor",
          body: text,
          contentType: "text",
          createdAt: new Date().toISOString(),
        },
        res.reply,
      ]);
    } catch (e) {
      setDraft(text);
      setError(e instanceof Error ? e.message : "Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="fixed bottom-4 right-4 text-sm text-muted-foreground">Memuat chat…</div>;
  }
  if (error && !config?.enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50" style={themeStyle}>
      {open ? (
        <div
          className="flex h-[420px] w-[340px] flex-col overflow-hidden rounded-2xl border shadow-xl"
          style={{ background: "var(--cw-bg)", color: "var(--cw-fg)" }}
        >
          <header
            className="flex items-center justify-between px-4 py-3 text-sm font-medium"
            style={{ background: "var(--cw-primary)", color: "var(--cw-primary-fg)" }}
          >
            <span>{config?.personaName ?? "Asisten"}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup">×</button>
          </header>
          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  m.role === "visitor" ? "ml-auto" : "mr-auto"
                }`}
                style={
                  m.role === "visitor"
                    ? { background: "var(--cw-primary)", color: "var(--cw-primary-fg)" }
                    : { background: "color-mix(in srgb, var(--cw-fg) 8%, transparent)" }
                }
              >
                {m.body}
              </div>
            ))}
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </div>
          <form
            className="flex gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              className="flex-1 rounded-full border px-3 py-2 text-sm outline-none"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ketik pesan…"
              disabled={sending}
            />
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-medium"
              style={{ background: "var(--cw-primary)", color: "var(--cw-primary-fg)" }}
              disabled={sending}
            >
              Kirim
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full px-5 py-3 text-sm font-semibold shadow-lg"
          style={{ background: "var(--cw-primary)", color: "var(--cw-primary-fg)" }}
        >
          Chat
        </button>
      )}
    </div>
  );
}
