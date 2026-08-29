"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  codesimApi,
  type CodesimAIPlanResponse,
  type CodesimTopicPreset,
} from "@/lib/api/codesim";
import { toast } from "sonner";

type SetupMode = "bank" | "ai";

export default function SimulationSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  const [mode, setMode] = useState<SetupMode>("bank");
  const [aiGenEnabled, setAiGenEnabled] = useState(false);
  const [presets, setPresets] = useState<CodesimTopicPreset[]>([]);
  const [tags, setTags] = useState<Array<{ id: string; label: string; mcqCount: number }>>([]);
  const [difficulties, setDifficulties] = useState<
    Array<{ id: string; label: string; mcqCount: number }>
  >([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [mcqCount, setMcqCount] = useState(5);
  const [mcqCountOptions, setMcqCountOptions] = useState<number[]>([3, 4, 5, 6, 7]);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const [aiBrief, setAiBrief] = useState("");
  const [aiPlan, setAiPlan] = useState<CodesimAIPlanResponse | null>(null);

  function clearPreview() {
    setPreviewId(null);
    setQuestionCount(0);
  }

  function clearAIPlan() {
    setAiPlan(null);
    clearPreview();
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await codesimApi.listTopics();
        if (cancelled) return;
        setPresets(catalog.presets);
        setTags(catalog.tags);
        setDifficulties(catalog.difficulties);
        setMcqCountOptions(catalog.mcqCountOptions);
        setMcqCount(catalog.defaultMcqCount);
        setAiGenEnabled(catalog.aiGenEnabled);
        const defaultPreset =
          catalog.presets.find((p) => p.id === "full-frontend") ?? catalog.presets[0];
        if (defaultPreset) {
          setSelectedTopics(defaultPreset.tags);
          setActivePreset(defaultPreset.id);
        } else if (catalog.suggested.length > 0) {
          setSelectedTopics(catalog.suggested);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal memuat topik");
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const estimatedMcqPool = useMemo(() => {
    if (selectedTopics.length === 0) {
      return tags.reduce((sum, t) => sum + t.mcqCount, 0);
    }
    return tags
      .filter((t) => selectedTopics.includes(t.id))
      .reduce((sum, t) => sum + t.mcqCount, 0);
  }, [selectedTopics, tags]);

  function toggleTopic(id: string) {
    clearPreview();
    setActivePreset(null);
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function applyPreset(preset: CodesimTopicPreset) {
    clearPreview();
    setActivePreset(preset.id);
    setSelectedTopics(preset.tags);
  }

  async function requestAIPlan() {
    const brief = aiBrief.trim();
    if (brief.length < 10) {
      toast.error("Deskripsi topik minimal 10 karakter");
      return;
    }
    setPlanLoading(true);
    clearAIPlan();
    try {
      const plan = await codesimApi.planAIExam(brief, mcqCount);
      setAiPlan(plan);
      toast.success("Rencana siap — review lalu konfirmasi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal buat rencana AI");
    } finally {
      setPlanLoading(false);
    }
  }

  async function createOrRegenerate(regenerate?: boolean) {
    if (mode === "bank" && selectedTopics.length === 0) {
      toast.error("Pilih minimal satu topik");
      return;
    }
    setLoading(true);
    try {
      let session;
      if (regenerate && previewId) {
        session = await codesimApi.regenerateSession(previewId);
      } else if (mode === "ai") {
        if (!aiPlan) {
          toast.error("Buat dan konfirmasi rencana AI dulu");
          return;
        }
        session = await codesimApi.createSession({ aiPlanId: aiPlan.planId });
      } else {
        session = await codesimApi.createSession({
          topics: selectedTopics,
          difficulty: selectedDifficulty || undefined,
          mcqCount,
          presetId: activePreset ?? undefined,
        });
      }
      setPreviewId(session.id);
      setQuestionCount(session.questions.length);
      toast.success(regenerate ? "Soal baru — materi berbeda" : "Tes di-generate — review lalu mulai");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal generate");
    } finally {
      setLoading(false);
    }
  }

  async function startExam() {
    if (!previewId) return;
    setLoading(true);
    try {
      const session = await codesimApi.startSession(previewId);
      router.push(`/learn/simulation/${session.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mulai");
    } finally {
      setLoading(false);
    }
  }

  const topicSummary =
    selectedTopics.length > 0
      ? selectedTopics
          .map((id) => tags.find((t) => t.id === id)?.label ?? id)
          .join(", ")
      : "Semua topik";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Setup simulasi</h1>
        <p className="mt-1 text-slate-600">
          Pilih topik dari bank soal, atau tulis topik bebas lalu AI susun rencana (konfirmasi
          dulu sebelum generate).
        </p>
      </div>

      {aiGenEnabled && (
        <div className="flex gap-2 rounded-lg border border-slate-200 bg-white p-1 w-fit">
          <button
            type="button"
            onClick={() => {
              setMode("bank");
              clearAIPlan();
            }}
            className={`rounded-md px-4 py-2 text-sm ${
              mode === "bank" ? "bg-emerald-600 text-white" : "text-slate-600"
            }`}
          >
            Bank soal
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("ai");
              clearPreview();
            }}
            className={`rounded-md px-4 py-2 text-sm ${
              mode === "ai" ? "bg-emerald-600 text-white" : "text-slate-600"
            }`}
          >
            Topik bebas (AI)
          </button>
        </div>
      )}

      {catalogLoading ? (
        <p className="text-slate-500">Memuat katalog topik…</p>
      ) : mode === "ai" ? (
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800">Deskripsi topik (free text)</h2>
            <textarea
              value={aiBrief}
              onChange={(e) => {
                setAiBrief(e.target.value);
                clearAIPlan();
              }}
              rows={4}
              placeholder="Contoh: Saya mau latihan React hooks, controlled forms, dan debugging infinite render loop"
              className="w-full rounded-md border border-slate-300 p-3 text-sm"
            />
            <p className="text-xs text-slate-500">
              AI hanya tersedia di local dev. Soal di-generate setelah kamu konfirmasi rencana.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800">Jumlah MCQ</h2>
            <div className="flex flex-wrap gap-2">
              {mcqCountOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setMcqCount(n);
                    clearAIPlan();
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    mcqCount === n
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {n} MCQ
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            disabled={planLoading}
            onClick={() => void requestAIPlan()}
            className="rounded-md border border-emerald-600 px-4 py-2 text-emerald-700 disabled:opacity-50"
          >
            {planLoading ? "Menyusun rencana…" : "Buat rencana AI"}
          </button>

          {aiPlan && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-3">
              <h3 className="font-semibold text-amber-950">Konfirmasi rencana ujian</h3>
              <p className="text-sm text-amber-900">{aiPlan.plan.summary}</p>
              <ul className="list-inside list-disc text-sm text-amber-900 space-y-1">
                <li>
                  <strong>MCQ ({aiPlan.plan.mcqCount}):</strong> {aiPlan.plan.mcqFocus}
                </li>
                <li>
                  <strong>Build:</strong> {aiPlan.plan.buildFocus}
                </li>
                <li>
                  <strong>Debug:</strong> {aiPlan.plan.debugFocus}
                </li>
                <li>
                  <strong>Kesulitan:</strong> {aiPlan.plan.suggestedDifficulty}
                </li>
              </ul>
              {aiPlan.plan.warnings && aiPlan.plan.warnings.length > 0 && (
                <ul className="text-xs text-amber-800">
                  {aiPlan.plan.warnings.map((w) => (
                    <li key={w}>⚠ {w}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-amber-700">
                Berlaku sampai {new Date(aiPlan.expiresAt).toLocaleTimeString("id-ID")}
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void createOrRegenerate(false)}
                className="rounded-md bg-amber-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Konfirmasi & generate tes
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Saran paket topik</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`rounded-lg border p-4 text-left transition ${
                    activePreset === preset.id
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <p className="font-medium text-slate-900">{preset.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{preset.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Atau pilih topik sendiri</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = selectedTopics.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTopic(tag.id)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      active
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:border-emerald-400"
                    }`}
                  >
                    {tag.label}{" "}
                    <span className={active ? "text-emerald-100" : "text-slate-400"}>
                      ({tag.mcqCount})
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800">Jumlah soal MCQ</h2>
            <div className="flex flex-wrap gap-2">
              {mcqCountOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    clearPreview();
                    setMcqCount(n);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    mcqCount === n
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:border-emerald-400"
                  }`}
                >
                  {n} MCQ
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800">Tingkat kesulitan MCQ</h2>
            <select
              value={selectedDifficulty}
              onChange={(e) => {
                clearPreview();
                setSelectedDifficulty(e.target.value);
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Semua tingkat</option>
              {difficulties.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label} ({d.mcqCount} soal)
                </option>
              ))}
            </select>
          </section>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              <strong>Topik:</strong> {topicSummary}
            </p>
            <p className="mt-1">
              <strong>Pool MCQ estimasi:</strong> ~{estimatedMcqPool} soal (butuh {mcqCount} per
              tes)
            </p>
            <p className="mt-1">
              <strong>Format:</strong> {questionCount || mcqCount + 2} soal, 60 menit
            </p>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        {mode === "bank" && (
          <button
            type="button"
            disabled={loading || catalogLoading}
            onClick={() => createOrRegenerate(false)}
            className="rounded-md bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Generate tes
          </button>
        )}
        {previewId && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => createOrRegenerate(true)}
              className="rounded-md border border-slate-300 px-4 py-2 disabled:opacity-50"
            >
              Generate ulang (soal berbeda)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void startExam()}
              className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              Mulai ujian
            </button>
          </>
        )}
      </div>
    </div>
  );
}
