"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { codesimApi, type CodesimSessionSummary } from "@/lib/api/codesim";
import { trackCodesimSession } from "@/lib/codesim/session-history";
import { toast } from "sonner";

const STATUS_LABEL: Record<CodesimSessionSummary["status"], string> = {
  setup: "Belum mulai",
  in_progress: "Sedang berjalan",
  submitted: "Selesai",
  expired: "Kedaluwarsa",
};

function sessionHref(s: CodesimSessionSummary): string {
  if (s.status === "submitted") {
    return `/learn/simulation/${s.id}/report`;
  }
  if (s.status === "setup") {
    return `/learn/simulation/setup?resume=${s.id}`;
  }
  return `/learn/simulation/${s.id}`;
}

function reuseHref(s: CodesimSessionSummary): string {
  return `/learn/simulation/setup?reuse=${s.id}`;
}

function actionLabel(s: CodesimSessionSummary): string {
  if (s.status === "submitted") return "Lihat laporan";
  if (s.status === "setup") return "Review & mulai";
  return "Lanjutkan";
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SimulationHistoryPage() {
  const [sessions, setSessions] = useState<CodesimSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [recoverId, setRecoverId] = useState("");
  const [recovering, setRecovering] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const list = await codesimApi.listSessions();
      setSessions(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat riwayat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await codesimApi.listSessions();
        if (!cancelled) setSessions(list);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Gagal memuat riwayat");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function recoverSession() {
    const id = recoverId.trim();
    if (!id) return;
    setRecovering(true);
    try {
      trackCodesimSession(id);
      await codesimApi.claimSession(id);
      await loadHistory();
      setRecoverId("");
      toast.success("Sesi dipulihkan ke riwayat browser ini");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ID sesi tidak ditemukan");
    } finally {
      setRecovering(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Riwayat simulasi</h1>
          <p className="mt-1 text-slate-600">
            Sesi ujian di browser ini — lanjutkan atau buka laporan. Tanpa login, riwayat
            tersimpan di perangkat ini saja.
          </p>
        </div>
        <Link
          href="/learn/simulation/setup"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Simulasi baru
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
        <p className="text-sm font-medium text-slate-800">Pulihkan sesi lama</p>
        <p className="text-xs text-slate-500">
          Tempel ID sesi dari URL (mis. dari tab setup/ujian yang masih terbuka).
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={recoverId}
            onChange={(e) => setRecoverId(e.target.value)}
            placeholder="550e8400-e29b-41d4-a716-446655440000"
            className="min-w-[240px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={recovering || !recoverId.trim()}
            onClick={() => void recoverSession()}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {recovering ? "Memulihkan…" : "Pulihkan"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-600">Memuat riwayat…</p>
      ) : sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">Belum ada riwayat simulasi di browser ini.</p>
          <p className="mt-2 text-sm text-slate-500">
            Generate tes baru setelah refresh halaman — riwayat akan tersimpan otomatis. Sesi
            sebelum update bisa dipulihkan lewat ID di atas.
          </p>
          <Link
            href="/learn/simulation/setup"
            className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline"
          >
            Mulai simulasi pertama
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{s.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {STATUS_LABEL[s.status]}
                  </span>
                  {s.source === "ai" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                      AI
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {s.questionCount} soal · diperbarui {formatWhen(s.updatedAt)}
                </p>
                {s.status === "submitted" && s.grade && (
                  <p className="text-sm text-emerald-800">
                    Nilai {s.grade} ({s.normalizedScore}%)
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {s.source === "ai" && (
                  <Link
                    href={reuseHref(s)}
                    className="rounded-md border border-amber-400 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-100"
                  >
                    Gunakan lagi
                  </Link>
                )}
                <Link
                  href={sessionHref(s)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  {actionLabel(s)}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link href="/learn/simulation" className="text-sm text-slate-600 hover:text-slate-900">
        ← Kembali ke simulasi
      </Link>
    </div>
  );
}
