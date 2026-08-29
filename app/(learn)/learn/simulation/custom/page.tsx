"use client";

import { useState } from "react";
import { toast } from "sonner";
import { codesimApi, type CodesimBlueprint } from "@/lib/api/codesim";

const defaultConfig: CodesimBlueprint["config"] = {
  sections: [
    { type: "mcq", count: 5, timeLimitMinutes: 20, tags: ["react"] },
    { type: "react_build", count: 1, timeLimitMinutes: 25, componentFamily: "form" },
    { type: "react_debug", count: 1, timeLimitMinutes: 15 },
  ],
  totalTimeLimitMinutes: 60,
  proctoring: {
    maxBlurEvents: 5,
    warnOnPaste: true,
    blockPasteInEditor: true,
  },
};

export default function CustomBlueprintPage() {
  const [title, setTitle] = useState("Template interviewer");
  const [configText, setConfigText] = useState(JSON.stringify(defaultConfig, null, 2));
  const [savedId, setSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function parseConfig(): CodesimBlueprint["config"] | null {
    try {
      return JSON.parse(configText) as CodesimBlueprint["config"];
    } catch {
      toast.error("JSON config tidak valid");
      return null;
    }
  }

  function exportJson() {
    const blob = new Blob([configText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codesim-blueprint.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setConfigText(text);
      toast.success("JSON diimpor — review lalu simpan");
    };
    reader.readAsText(file);
  }

  async function saveBlueprint() {
    const config = parseConfig();
    if (!config) return;
    setLoading(true);
    try {
      const id = await codesimApi.saveCustomBlueprint(title, config);
      setSavedId(id);
      toast.success("Template disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal simpan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Template interviewer</h1>
        <p className="mt-1 text-slate-600">
          Sesuaikan blueprint (section, waktu, proctoring) lalu export/import JSON.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Judul template</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Config JSON</span>
        <textarea
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          rows={18}
          className="w-full font-mono text-sm rounded-md border border-slate-300 p-3"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => void saveBlueprint()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Simpan ke akun
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="rounded-md border border-slate-300 px-4 py-2"
        >
          Export JSON
        </button>
        <label className="cursor-pointer rounded-md border border-slate-300 px-4 py-2">
          Import JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
            }}
          />
        </label>
      </div>

      {savedId && (
        <p className="text-sm text-slate-600">
          ID tersimpan: <code className="rounded bg-slate-100 px-1">{savedId}</code>
        </p>
      )}
    </div>
  );
}
