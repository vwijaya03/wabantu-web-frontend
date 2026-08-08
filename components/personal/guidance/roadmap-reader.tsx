"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

import type {
  IngredientGroup,
  IngredientItem,
  RoadmapGuidance,
} from "@/lib/guidance/roadmap-fnb";

const CHECKED_STORAGE_KEY = "guidance-roadmap-checked-v1";

type SectionDef = { id: string; label: string };

const SECTIONS: SectionDef[] = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "menu", label: "Menu & Rasa" },
  { id: "bahan", label: "Bahan & Belanja" },
  { id: "masak", label: "Cara Masak" },
  { id: "halal", label: "Halal" },
  { id: "fase", label: "Fase" },
  { id: "sembilan-puluh-hari", label: "90 Hari" },
  { id: "uang", label: "Uang & Prinsip" },
];

type SearchEntry = {
  sectionId: string;
  sectionLabel: string;
  group: string;
  text: string;
};

function buildSearchIndex(data: RoadmapGuidance): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const add = (sectionId: string, group: string, texts: (string | undefined)[]) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    for (const text of texts) {
      if (text && text.trim()) {
        entries.push({ sectionId, sectionLabel: section?.label ?? sectionId, group, text });
      }
    }
  };

  add("ringkasan", data.numbers.title, data.numbers.points);
  add(
    "ringkasan",
    "Estimasi waktu",
    data.numbers.timeline.map((t) => `${t.label}: ${t.value}`),
  );
  add("ringkasan", data.strategy.title, [
    data.strategy.core,
    data.strategy.notThis,
    ...data.strategy.reasons,
    data.strategy.salesModel,
    data.strategy.phase0Tools,
  ]);

  add("menu", data.heroMenu.title, [
    data.heroMenu.workingName,
    ...data.heroMenu.principles,
    ...data.heroMenu.plateContents,
    data.heroMenu.priceAnchor,
    data.heroMenu.validation,
  ]);
  add(
    "menu",
    "SKU",
    data.heroMenu.skus.map((s) => `${s.name} — ${s.flavor}. ${s.order}`),
  );
  add("menu", data.flavor.title, [
    ...data.flavor.surabayaProfile,
    ...data.flavor.marketProof,
    ...data.flavor.decisions,
  ]);
  add("menu", data.sauce.title, [
    data.sauce.anatomy,
    ...data.sauce.components.map((c) => `${c.role}: ${c.ingredient} (${c.buyNote})`),
  ]);

  for (const group of data.recipe.ingredientGroups) {
    add(
      "bahan",
      group.title,
      group.items.map((i) => [i.qty, i.name, i.note].filter(Boolean).join(" — ")),
    );
  }
  add("bahan", "Jangan pakai", data.recipe.avoid);
  add(
    "bahan",
    "Checklist belanja Surabaya",
    data.halal.shoppingChecklist.map((i) => [i.name, i.note].filter(Boolean).join(" — ")),
  );

  for (const group of data.recipe.stepGroups) {
    add("masak", group.title, group.steps);
  }
  add("masak", "Kalibrasi lidah Surabaya", data.sauce.calibration);
  add(
    "masak",
    "Troubleshooting",
    data.recipe.troubleshooting.map((t) => `${t.symptom}: ${t.fix}`),
  );
  add("masak", "Scale preorder", data.recipe.scaling);
  add("masak", data.practice.title, data.practice.days);

  add("halal", data.halal.title, [data.halal.intro]);
  add(
    "halal",
    "Substitusi halal",
    data.halal.swaps.map((s) => `${s.problem} (${s.why}) → ${s.swap}`),
  );
  add("halal", "Prinsip rasa halal", data.halal.flavorPrinciples);
  add("halal", "Mirin halal homemade", data.halal.mirinSubstitute);
  add("halal", "Yang tidak dilakukan", data.halal.donts);

  for (const phase of data.phases) {
    add("fase", `${phase.name} (${phase.period})`, [
      phase.goal,
      ...phase.actions,
      ...phase.targets,
      ...(phase.prohibitions ?? []),
    ]);
  }

  for (const block of data.ninetyDays.blocks) {
    add("sembilan-puluh-hari", block.title, block.items);
  }

  add("uang", "Alokasi profit", data.moneyRules.allocation);
  add("uang", "Aturan sandwich generation", data.moneyRules.sandwichRules);
  add("uang", "Kapan resign", [data.moneyRules.quitJobRule]);
  add("uang", data.principles.title, data.principles.items);
  add("uang", data.techRole.title, data.techRole.items);

  return entries;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function RoadmapGuidanceReader() {
  const [data, setData] = useState<RoadmapGuidance | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  // Lazy init dari localStorage — aman untuk hydration karena checklist baru
  // dirender setelah data endpoint termuat (render pertama = skeleton).
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(CHECKED_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/guidance/roadmap")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((payload: RoadmapGuidance) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searchIndex = useMemo(() => (data ? buildSearchIndex(data) : []), [data]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter(
      (e) => e.text.toLowerCase().includes(q) || e.group.toLowerCase().includes(q),
    );
  }, [query, searchIndex]);

  const toggleChecked = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(CHECKED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage penuh/di-block — state tetap jalan di memori
      }
      return next;
    });
  };

  const resetChecked = () => {
    setChecked({});
    try {
      localStorage.removeItem(CHECKED_STORAGE_KEY);
    } catch {
      // abaikan
    }
  };

  const allIngredients: { group: IngredientGroup; item: IngredientItem }[] = useMemo(() => {
    if (!data) return [];
    return data.recipe.ingredientGroups.flatMap((group) =>
      group.items.map((item) => ({ group, item })),
    );
  }, [data]);

  const checkedCount = allIngredients.filter(({ item }) => checked[item.id]).length;

  const copyShoppingList = async () => {
    if (!data) return;
    const remaining = allIngredients.filter(({ item }) => !checked[item.id]);
    const list = remaining.length > 0 ? remaining : allIngredients;
    const lines: string[] = ["Belanja Korean Soy Garlic Grill (2 porsi):"];
    let currentGroup = "";
    for (const { group, item } of list) {
      if (group.title !== currentGroup) {
        currentGroup = group.title;
        lines.push("", `[${group.title}]`);
      }
      lines.push(`- ${[item.qty, item.name].filter(Boolean).join(" ")}${item.note ? ` (${item.note})` : ""}`);
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard di-block — tidak fatal
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[880px] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg text-neutral-600">Guidance gagal dimuat. Coba muat ulang.</p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Muat ulang
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[880px] space-y-4 px-4 py-16">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-100" />
        <div className="mt-8 h-40 w-full animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-[880px] px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-base font-semibold tracking-tight text-neutral-900">
              {data.meta.title}
            </h1>
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari bahan, langkah, aturan…"
                className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-9 pr-9 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Kosongkan pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-neutral-400 transition hover:text-neutral-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {!query && (
            <nav className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className="shrink-0 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
                >
                  {s.label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {query ? (
        <main className="mx-auto max-w-[880px] px-4 py-8">
          <p className="text-sm text-neutral-500">
            {results.length} hasil untuk <span className="font-medium text-neutral-900">{query}</span>
          </p>
          <ul className="mt-4 space-y-3">
            {results.map((r, i) => (
              <li key={`${r.sectionId}-${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setTimeout(() => scrollToSection(r.sectionId), 50);
                  }}
                  className="w-full rounded-2xl border border-neutral-200/80 bg-white p-4 text-left transition hover:border-neutral-400"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 font-medium text-white">
                      {r.sectionLabel}
                    </span>
                    <span className="text-neutral-500">{r.group}</span>
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed text-neutral-800">{r.text}</p>
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
                Tidak ada yang cocok. Coba kata lain, mis. &quot;kecap&quot;, &quot;food cost&quot;, &quot;air fryer&quot;.
              </li>
            )}
          </ul>
        </main>
      ) : (
        <main className="mx-auto max-w-[880px] px-4">
          {/* Hero */}
          <section className="py-12 sm:py-16">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
              Guidance pribadi · {data.meta.location} · diperbarui {data.meta.updatedAt}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              {data.meta.title}
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-neutral-600">
              {data.meta.subtitle}
            </p>
            <p className="mt-4 inline-block rounded-xl bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 ring-1 ring-neutral-200/80">
              {data.meta.productLock}
            </p>
          </section>

          {/* Ringkasan */}
          <Section id="ringkasan" title={data.numbers.title}>
            <ul className="space-y-3">
              {data.numbers.points.map((p) => (
                <ListCard key={p}>{p}</ListCard>
              ))}
            </ul>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {data.numbers.timeline.map((t) => (
                <div key={t.label} className="rounded-2xl border border-neutral-200/80 bg-white p-5">
                  <p className="text-sm text-neutral-500">{t.label}</p>
                  <p className="mt-1 text-xl font-semibold text-neutral-900">{t.value}</p>
                </div>
              ))}
            </div>

            <h4 className="mt-10 text-lg font-semibold text-neutral-900">{data.strategy.title}</h4>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-800">{data.strategy.core}</p>
            <p className="mt-2 flex gap-2 text-[15px] leading-relaxed text-neutral-600">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              {data.strategy.notThis}
            </p>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
              {data.strategy.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-800">{data.strategy.salesModel}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-800">{data.strategy.phase0Tools}</p>
          </Section>

          {/* Menu & Rasa */}
          <Section id="menu" title={data.heroMenu.title}>
            <p className="text-lg font-medium text-neutral-900">{data.heroMenu.workingName}</p>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
              {data.heroMenu.principles.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {data.heroMenu.skus.map((sku, i) => (
                <div key={sku.id} className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">SKU {i + 1}</p>
                  <h4 className="mt-1 text-lg font-semibold text-neutral-900">{sku.name}</h4>
                  <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{sku.flavor}</p>
                  <p className="mt-3 text-sm font-medium text-neutral-800">{sku.order}</p>
                </div>
              ))}
            </div>

            <h4 className="mt-8 text-base font-semibold text-neutral-900">Isi 1 porsi Phase 1</h4>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
              {data.heroMenu.plateContents.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-[15px] text-neutral-800 ring-1 ring-neutral-200/80">
              {data.heroMenu.priceAnchor}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-700">{data.heroMenu.validation}</p>

            <h4 className="mt-10 text-lg font-semibold text-neutral-900">{data.flavor.title}</h4>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-neutral-500">Profil lidah Surabaya</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
                  {data.flavor.surabayaProfile.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">Keputusan rasa</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
                  {data.flavor.decisions.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium text-neutral-500">Bukti pasar</p>
            <ul className="mt-2 space-y-3">
              {data.flavor.marketProof.map((p) => (
                <ListCard key={p}>{p}</ListCard>
              ))}
            </ul>

            <h4 className="mt-10 text-lg font-semibold text-neutral-900">{data.sauce.title}</h4>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-700">{data.sauce.anatomy}</p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-200/80">
              <table className="w-full min-w-[560px] text-left text-[15px]">
                <thead>
                  <tr className="border-b border-neutral-200/80 bg-neutral-50 text-sm text-neutral-500">
                    <th className="px-4 py-3 font-medium">Fungsi</th>
                    <th className="px-4 py-3 font-medium">Bahan</th>
                    <th className="px-4 py-3 font-medium">Catatan beli Surabaya</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sauce.components.map((c) => (
                    <tr key={c.role} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-neutral-900">{c.role}</td>
                      <td className="px-4 py-3 text-neutral-700">{c.ingredient}</td>
                      <td className="px-4 py-3 text-neutral-600">{c.buyNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Bahan & Belanja */}
          <Section id="bahan" title="Bahan & Belanja">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px] text-neutral-600">
                {data.recipe.title} —{" "}
                <span className="font-medium text-neutral-900">
                  {checkedCount}/{allIngredients.length} bahan dicentang
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyShoppingList}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-700"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Tersalin" : "Salin daftar belanja"}
                </button>
                <button
                  type="button"
                  onClick={resetChecked}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 sm:grid-cols-3">
              {data.recipe.info.map((i) => (
                <div key={i.label}>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{i.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-800">{i.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-6">
              {data.recipe.ingredientGroups.map((group) => (
                <div key={group.id} className="rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6">
                  <h4 className="text-base font-semibold text-neutral-900">{group.title}</h4>
                  {group.note && <p className="mt-1 text-sm text-neutral-500">{group.note}</p>}
                  <ul className="mt-4 space-y-1">
                    {group.items.map((item) => {
                      const isChecked = Boolean(checked[item.id]);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => toggleChecked(item.id)}
                            className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-neutral-50"
                          >
                            {isChecked ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                            ) : (
                              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-neutral-300" />
                            )}
                            <span className="text-[15px] leading-relaxed">
                              <span
                                className={
                                  isChecked
                                    ? "font-medium text-neutral-400 line-through"
                                    : "font-medium text-neutral-900"
                                }
                              >
                                {item.qty ? `${item.qty} · ` : ""}
                                {item.name}
                              </span>
                              {item.note && (
                                <span className={isChecked ? "text-neutral-300" : "text-neutral-500"}>
                                  {" "}
                                  — {item.note}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <h4 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Jangan pakai
              </h4>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
                {data.recipe.avoid.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>

            <h4 className="mt-8 text-base font-semibold text-neutral-900">Checklist beli bahan (Surabaya)</h4>
            <ul className="mt-3 space-y-1">
              {data.halal.shoppingChecklist.map((item) => {
                const isChecked = Boolean(checked[item.id]);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleChecked(item.id)}
                      className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-neutral-50"
                    >
                      {isChecked ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-neutral-300" />
                      )}
                      <span className="text-[15px] leading-relaxed">
                        <span className={isChecked ? "text-neutral-400 line-through" : "text-neutral-900"}>
                          {item.name}
                        </span>
                        {item.note && (
                          <span className={isChecked ? "text-neutral-300" : "text-neutral-500"}>
                            {" "}
                            — {item.note}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* Cara Masak */}
          <Section id="masak" title="Cara Masak">
            <ol className="space-y-6">
              {data.recipe.stepGroups.map((group) => (
                <li key={group.id} className="rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6">
                  <h4 className="text-base font-semibold text-neutral-900">{group.title}</h4>
                  {group.note && <p className="mt-1 text-sm text-neutral-500">{group.note}</p>}
                  <ol className="mt-4 space-y-2.5">
                    {group.steps.map((step, i) => (
                      <li key={step} className="flex gap-3 text-[15px] leading-relaxed text-neutral-700">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>

            <h4 className="mt-8 text-base font-semibold text-neutral-900">Kalibrasi lidah Surabaya</h4>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
              {data.sauce.calibration.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>

            <h4 className="mt-8 text-base font-semibold text-neutral-900">Troubleshooting cepat</h4>
            <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200/80">
              {data.recipe.troubleshooting.map((t) => (
                <div
                  key={t.symptom}
                  className="grid gap-1 border-b border-neutral-100 px-4 py-3 last:border-0 sm:grid-cols-[180px_1fr] sm:gap-4"
                >
                  <p className="text-[15px] font-medium text-neutral-900">{t.symptom}</p>
                  <p className="text-[15px] leading-relaxed text-neutral-600">{t.fix}</p>
                </div>
              ))}
            </div>

            <h4 className="mt-8 text-base font-semibold text-neutral-900">Scale untuk preorder</h4>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
              {data.recipe.scaling.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>

            <h4 className="mt-8 text-base font-semibold text-neutral-900">{data.practice.title}</h4>
            <ul className="mt-3 space-y-3">
              {data.practice.days.map((d) => (
                <ListCard key={d}>{d}</ListCard>
              ))}
            </ul>
          </Section>

          {/* Halal */}
          <Section id="halal" title={data.halal.title}>
            <p className="text-[15px] leading-relaxed text-neutral-700">{data.halal.intro}</p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-200/80">
              <table className="w-full min-w-[640px] text-left text-[15px]">
                <thead>
                  <tr className="border-b border-neutral-200/80 bg-neutral-50 text-sm text-neutral-500">
                    <th className="px-4 py-3 font-medium">Bahan bermasalah</th>
                    <th className="px-4 py-3 font-medium">Kenapa</th>
                    <th className="px-4 py-3 font-medium">Ganti halal (rasa tetap dekat)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.halal.swaps.map((s) => (
                    <tr key={s.problem} className="border-b border-neutral-100 align-top last:border-0">
                      <td className="px-4 py-3 font-medium text-neutral-900">{s.problem}</td>
                      <td className="px-4 py-3 text-neutral-600">{s.why}</td>
                      <td className="px-4 py-3 leading-relaxed text-neutral-700">{s.swap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="mt-8 text-base font-semibold text-neutral-900">Prinsip rasa biar tetap original</h4>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
              {data.halal.flavorPrinciples.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <h4 className="mt-8 text-base font-semibold text-neutral-900">Mirin halal stok (opsional)</h4>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
              {data.halal.mirinSubstitute.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <h4 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Yang tidak dilakukan
              </h4>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
                {data.halal.donts.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </Section>

          {/* Fase */}
          <Section id="fase" title="Fase perjalanan">
            <div className="space-y-6">
              {data.phases.map((phase) => (
                <div key={phase.id} className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="text-lg font-semibold text-neutral-900">{phase.name}</h4>
                    <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
                      {phase.period}
                    </span>
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{phase.goal}</p>

                  <p className="mt-5 text-sm font-medium text-neutral-500">Aksi</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
                    {phase.actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>

                  <p className="mt-5 text-sm font-medium text-neutral-500">Target / definisi sukses</p>
                  <ul className="mt-2 space-y-1.5">
                    {phase.targets.map((t) => (
                      <li key={t} className="flex gap-2 text-[15px] leading-relaxed text-neutral-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {t}
                      </li>
                    ))}
                  </ul>

                  {phase.prohibitions && (
                    <>
                      <p className="mt-5 text-sm font-medium text-neutral-500">Dilarang di fase ini</p>
                      <ul className="mt-2 space-y-1.5">
                        {phase.prohibitions.map((p) => (
                          <li key={p} className="flex gap-2 text-[15px] leading-relaxed text-neutral-700">
                            <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* 90 Hari */}
          <Section id="sembilan-puluh-hari" title={data.ninetyDays.title}>
            <div className="grid gap-4 lg:grid-cols-3">
              {data.ninetyDays.blocks.map((block) => (
                <div key={block.id} className="rounded-2xl border border-neutral-200/80 bg-white p-5">
                  <h4 className="text-base font-semibold text-neutral-900">{block.title}</h4>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          {/* Uang & Prinsip */}
          <Section id="uang" title={data.moneyRules.title}>
            <p className="text-sm font-medium text-neutral-500">
              Alokasi dari profit F&amp;B + sisih gaji (Phase 1)
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
              {data.moneyRules.allocation.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>

            <p className="mt-6 text-sm font-medium text-neutral-500">Aturan sandwich generation</p>
            <ul className="mt-2 space-y-3">
              {data.moneyRules.sandwichRules.map((r) => (
                <ListCard key={r}>{r}</ListCard>
              ))}
            </ul>

            <p className="mt-6 rounded-xl bg-neutral-900 px-5 py-4 text-[15px] font-medium leading-relaxed text-white">
              {data.moneyRules.quitJobRule}
            </p>

            <h4 className="mt-10 text-lg font-semibold text-neutral-900">{data.principles.title}</h4>
            <ol className="mt-4 space-y-2.5">
              {data.principles.items.map((p, i) => (
                <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-neutral-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                    {i + 1}
                  </span>
                  {p}
                </li>
              ))}
            </ol>

            <h4 className="mt-10 text-lg font-semibold text-neutral-900">{data.techRole.title}</h4>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-neutral-700">
              {data.techRole.items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Section>
        </main>
      )}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-neutral-100 py-12 sm:py-14">
      <h3 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">{title}</h3>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ListCard({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-2xl border border-neutral-200/80 bg-white p-4 text-[15px] leading-relaxed text-neutral-700">
      {children}
    </li>
  );
}
