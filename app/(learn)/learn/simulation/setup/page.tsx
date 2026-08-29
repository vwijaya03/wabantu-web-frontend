"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { codesimApi, type CodesimTopicPreset } from "@/lib/api/codesim";
import { toast } from "sonner";

export default function SimulationSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

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

  function clearPreview() {
    setPreviewId(null);
    setQuestionCount(0);
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

  async function createOrRegenerate(regenerate?: boolean) {
    if (selectedTopics.length === 0) {
      toast.error("Pilih minimal satu topik");
      return;
    }
    setLoading(true);
    try {
      const params = {
        topics: selectedTopics,
        difficulty: selectedDifficulty || undefined,
        mcqCount,
        presetId: activePreset ?? undefined,
      };
      let session;
      if (regenerate && previewId) {
        session = await codesimApi.regenerateSession(previewId);
      } else {
        session = await codesimApi.createSession(params);
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
          Pilih topik dan jumlah MCQ. Setiap generate memakai seed acak — soal berbeda, struktur
          sama ({mcqCount} MCQ + 1 build + 1 debug).
        </p>
      </div>

      {catalogLoading ? (
        <p className="text-slate-500">Memuat katalog topik…</p>
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
              <strong>Pool MCQ estimasi:</strong> ~{estimatedMcqPool} soal (butuh {mcqCount} per tes)
            </p>
            <p className="mt-1">
              <strong>Format:</strong> {questionCount || mcqCount + 2} soal, 60 menit
            </p>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading || catalogLoading}
          onClick={() => createOrRegenerate(false)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Generate tes
        </button>
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
