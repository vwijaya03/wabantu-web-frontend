"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { codesimApi } from "@/lib/api/codesim";

type ProctoringContextValue = {
  blurCount: number;
  pasteCount: number;
  acknowledged: boolean;
  setAcknowledged: (v: boolean) => void;
};

const ProctoringContext = createContext<ProctoringContextValue | null>(null);

export function useProctoring() {
  const ctx = useContext(ProctoringContext);
  if (!ctx) throw new Error("useProctoring outside provider");
  return ctx;
}

type Props = {
  sessionId: string | null;
  active: boolean;
  blockPasteInEditor?: boolean;
  children: ReactNode;
};

export function ProctoringProvider({
  sessionId,
  active,
  blockPasteInEditor = true,
  children,
}: Props) {
  const [blurCount, setBlurCount] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const queueRef = useRef<Array<{ eventType: string; metadata?: Record<string, unknown> }>>([]);

  const flush = useCallback(async () => {
    if (!sessionId || queueRef.current.length === 0) return;
    const batch = [...queueRef.current];
    queueRef.current = [];
    try {
      await codesimApi.recordProctorEvents(sessionId, batch);
    } catch {
      queueRef.current.unshift(...batch);
    }
  }, [sessionId]);

  const push = useCallback(
    (eventType: string, metadata?: Record<string, unknown>) => {
      queueRef.current.push({ eventType, metadata });
      void flush();
    },
    [flush]
  );

  useEffect(() => {
    if (!active) return;

    const onBlur = () => {
      setBlurCount((c) => c + 1);
      push("blur");
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        setBlurCount((c) => c + 1);
        push("visibility_hidden");
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditor = target?.closest("[data-codesim-editor]");
      if (blockPasteInEditor && inEditor) {
        e.preventDefault();
      }
      setPasteCount((c) => c + 1);
      push("paste", { blocked: Boolean(blockPasteInEditor && inEditor) });
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("paste", onPaste);

    const interval = setInterval(() => void flush(), 10_000);

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearInterval(interval);
      void flush();
    };
  }, [active, blockPasteInEditor, flush, push]);

  return (
    <ProctoringContext.Provider
      value={{ blurCount, pasteCount, acknowledged, setAcknowledged }}
    >
      {children}
    </ProctoringContext.Provider>
  );
}

export function ProctoringDisclaimer({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
      <h2 className="mb-2 text-lg font-semibold">Proctored assessment</h2>
      <p className="mb-4 leading-relaxed">
        Complete this test independently without AI tools, external snippets, or outside
        assistance. Window focus loss and suspicious activity (tab switch, paste) are logged.
      </p>
      <button
        type="button"
        onClick={onAccept}
        className="rounded-md bg-amber-900 px-4 py-2 text-white hover:bg-amber-800"
      >
        I understand — start
      </button>
    </div>
  );
}

export function ProctoringBanner() {
  const { blurCount, pasteCount } = useProctoring();
  if (blurCount === 0 && pasteCount === 0) return null;
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      {blurCount > 0 && <span>Tab blur: {blurCount} </span>}
      {pasteCount > 0 && <span>Paste: {pasteCount}</span>}
    </div>
  );
}
