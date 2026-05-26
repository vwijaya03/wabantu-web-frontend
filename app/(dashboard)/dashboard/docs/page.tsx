"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, FileText, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DocsPayload = {
  generatedAt: string;
  totalDocs: number;
  docs: DocsDoc[];
};

type DocsDoc = {
  id: string;
  source: "api-go" | "web-frontend" | string;
  path: string;
  title: string;
  category: string;
  headings: DocsHeading[];
  excerpt: string;
  content: string;
  text: string;
  searchText: string;
};

type DocsHeading = {
  level: number;
  text: string;
  anchor?: string;
  excerpt?: string;
  searchText?: string;
};

type Result = {
  doc: DocsDoc;
  score: number;
  snippet: string;
  sections: SectionMatch[];
};

type SectionMatch = {
  heading: DocsHeading;
  score: number;
  snippet: string;
};

const ALL = "__all__";
const EMPTY_DOCS: DocsDoc[] = [];

export default function DocsPage() {
  const { user } = useAuth();
  const [payload, setPayload] = useState<DocsPayload | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    let active = true;
    fetch("/generated-docs/docs-index.json")
      .then((res) => {
        if (!res.ok) throw new Error("docs index not found");
        return res.json() as Promise<DocsPayload>;
      })
      .then((data) => {
        if (!active) return;
        setPayload(data);
        setSelectedId(data.docs[0]?.id ?? "");
      })
      .catch(() => {
        if (active) setLoadError("Dokumentasi belum digenerate. Jalankan npm run docs:generate di web-frontend.");
      });
    return () => {
      active = false;
    };
  }, []);

  const docs = useMemo(() => payload?.docs ?? EMPTY_DOCS, [payload?.docs]);
  const sources = useMemo(() => unique(docs.map((d) => d.source)), [docs]);
  const categories = useMemo(() => unique(docs.map((d) => d.category)), [docs]);

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      if (source !== ALL && doc.source !== source) return false;
      if (category !== ALL && doc.category !== category) return false;
      return true;
    });
  }, [category, docs, source]);

  const queryTokens = useMemo(() => tokens(query), [query]);
  const results = useMemo(() => searchDocs(filteredDocs, query), [filteredDocs, query]);
  const selectedDoc = useMemo(() => {
    return docs.find((d) => d.id === selectedId) ?? results[0]?.doc ?? docs[0];
  }, [docs, results, selectedId]);
  const selectedResult = useMemo(() => {
    if (!selectedDoc) return undefined;
    return results.find((r) => r.doc.id === selectedDoc.id);
  }, [results, selectedDoc]);
  const selectedSections = selectedResult?.sections ?? [];

  if (user?.role !== "super_admin") {
    return (
      <PageHeader
        title="Dokumentasi"
        description="Akses platform admin diperlukan untuk melihat dokumentasi internal."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Dokumentasi"
        description="Gabungan README dan file Markdown dari api-go dan web-frontend."
        actions={
          payload ? (
            <Badge variant="outline">
              {payload.totalDocs} dokumen · {formatGeneratedAt(payload.generatedAt)}
            </Badge>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cari Dokumentasi</CardTitle>
          <CardDescription>
            Search ini toleran typo ringan, urutan kata bebas, dan tetap memprioritaskan judul/path yang paling relevan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_180px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari: superadmin bootstrap, export PDF, quota topup, finance timezone..."
            />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua source</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua kategori</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loadError ? (
        <Card className="border-destructive/30">
          <CardContent className="pt-6 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <Card className="xl:max-h-[calc(100vh-260px)] xl:overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Hasil Terdekat</CardTitle>
              <CardDescription>
                {results.length} hasil dari {filteredDocs.length} dokumen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 xl:max-h-[calc(100vh-360px)] xl:overflow-auto">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada hasil yang cukup relevan.</p>
              ) : (
                results.map(({ doc, score, snippet }) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedId(doc.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/60",
                      selectedDoc?.id === doc.id && "border-primary bg-primary/5",
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          <HighlightedText text={doc.title} tokens={queryTokens} />
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{doc.path}</p>
                      </div>
                      <Badge variant="outline">{Math.round(score)}</Badge>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1">
                      <Badge variant="secondary">{doc.source}</Badge>
                      <Badge variant="outline">{doc.category}</Badge>
                    </div>
                    {doc.headings.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {(searchSections(doc, queryTokens).length > 0
                          ? searchSections(doc, queryTokens)
                          : doc.headings
                        )
                          .slice(0, 3)
                          .map((section, idx) => {
                            const heading = "heading" in section ? section.heading : section;
                            return (
                              <Badge key={`${heading.text}-${idx}`} variant="outline" className="max-w-full truncate">
                                {heading.text}
                              </Badge>
                            );
                          })}
                      </div>
                    )}
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      <HighlightedText text={snippet} tokens={queryTokens} />
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="xl:max-h-[calc(100vh-260px)] xl:overflow-hidden">
            {selectedDoc ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5" />
                        {selectedDoc.title}
                      </CardTitle>
                      <CardDescription>{selectedDoc.path}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{selectedDoc.source}</Badge>
                      <Badge variant="outline">{selectedDoc.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6 xl:max-h-[calc(100vh-375px)] xl:grid-cols-[220px_1fr] xl:overflow-auto">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Heading</p>
                    {selectedDoc.headings.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Tidak ada heading.</p>
                    ) : (
                      <div className="space-y-1">
                        {selectedDoc.headings.slice(0, 24).map((h, i) => (
                          <a
                            key={`${h.text}-${i}`}
                            href={h.anchor ? `#${h.anchor}` : undefined}
                            className={cn(
                              "block truncate rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground",
                              h.level === 1 && "font-semibold text-foreground",
                              h.level > 2 && "pl-3",
                            )}
                            title={h.text}
                          >
                            <HighlightedText text={h.text} tokens={queryTokens} />
                          </a>
                        ))}
                      </div>
                    )}
                    {selectedSections.length > 0 && (
                      <div className="mt-5 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Poin Relevan
                        </p>
                        {selectedSections.slice(0, 6).map((section) => (
                          <a
                            key={`${section.heading.anchor}-${section.heading.text}`}
                            href={section.heading.anchor ? `#${section.heading.anchor}` : undefined}
                            className="block rounded-md border p-2 text-xs hover:bg-muted/60"
                          >
                            <p className="font-medium text-foreground">
                              <HighlightedText text={section.heading.text} tokens={queryTokens} />
                            </p>
                            {section.snippet && (
                              <p className="mt-1 line-clamp-3 text-muted-foreground">
                                <HighlightedText text={section.snippet} tokens={queryTokens} />
                              </p>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <MarkdownView content={selectedDoc.content} tokens={queryTokens} />
                </CardContent>
              </>
            ) : (
              <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                <FileText className="mr-2 h-4 w-4" />
                Pilih dokumen untuk dibaca.
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return normalize(value)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function searchDocs(docs: DocsDoc[], query: string): Result[] {
  const q = normalize(query);
  const qTokens = tokens(query);
  const base = docs.map((doc) => ({
    doc,
    score: qTokens.length === 0 ? 1 : scoreDoc(doc, q, qTokens),
    snippet: qTokens.length === 0 ? doc.excerpt : makeSnippet(doc.text, qTokens),
    sections: qTokens.length === 0 ? [] : searchSections(doc, qTokens),
  }));

  return base
    .filter((r) => qTokens.length === 0 || r.score >= Math.max(10, qTokens.length * 6))
    .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title));
}

function searchSections(doc: DocsDoc, qTokens: string[]): SectionMatch[] {
  if (qTokens.length === 0) return [];
  return doc.headings
    .map((heading) => {
      const target = normalize(`${heading.text} ${heading.searchText ?? heading.excerpt ?? ""}`);
      let score = 0;
      for (const token of qTokens) {
        if (normalize(heading.text).includes(token)) score += 35;
        if (target.includes(token)) score += 12;
        else if (tokens(target).some((t) => isNearToken(t, token))) score += 6;
      }
      const matched = qTokens.filter((token) => target.includes(token)).length;
      if (matched === qTokens.length) score += 20;
      return {
        heading,
        score,
        snippet: heading.excerpt ?? "",
      };
    })
    .filter((section) => section.score >= Math.max(12, qTokens.length * 6))
    .sort((a, b) => b.score - a.score);
}

function scoreDoc(doc: DocsDoc, query: string, qTokens: string[]) {
  const title = normalize(doc.title);
  const pathText = normalize(doc.path);
  const headingText = normalize(doc.headings.map((h) => h.text).join(" "));
  const searchText = normalize(doc.searchText);
  let score = 0;

  if (title.includes(query)) score += 120;
  if (pathText.includes(query)) score += 80;
  if (searchText.includes(query)) score += 45;

  const titleTokens = tokens(doc.title);
  const pathTokens = tokens(doc.path.replace(/[/.]/g, " "));
  const headingTokens = tokens(headingText);
  const allTokens = new Set(tokens(searchText));

  for (const token of qTokens) {
    if (titleTokens.some((t) => t === token)) score += 42;
    else if (titleTokens.some((t) => t.startsWith(token) || token.startsWith(t))) score += 30;
    else if (titleTokens.some((t) => isNearToken(t, token))) score += 20;

    if (pathTokens.some((t) => t === token || t.startsWith(token))) score += 24;
    if (headingTokens.some((t) => t === token || t.startsWith(token))) score += 18;
    if (allTokens.has(token)) score += 10;
    else if (Array.from(allTokens).some((t) => isNearToken(t, token))) score += 6;
  }

  const matched = qTokens.filter((token) => searchText.includes(token)).length;
  if (matched === qTokens.length) score += 25;
  if (matched === 0) score -= 30;
  return score;
}

function isNearToken(a: string, b: string) {
  if (a.length < 4 || b.length < 4) return false;
  if (Math.abs(a.length - b.length) > 2) return false;
  return levenshtein(a, b, 2) <= 2;
}

function levenshtein(a: string, b: string, maxDistance: number) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > maxDistance) return rowMin;
    prev = curr;
  }
  return prev[b.length];
}

function makeSnippet(text: string, qTokens: string[]) {
  const normalizedText = normalize(text);
  const firstIndex = qTokens
    .map((token) => normalizedText.indexOf(token))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b)[0];
  if (firstIndex == null) return text.slice(0, 220);

  const start = Math.max(0, firstIndex - 90);
  const snippet = text.slice(start, start + 260).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "..." : ""}${snippet}${start + 260 < text.length ? "..." : ""}`;
}

function formatGeneratedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "index docs";
  return `index ${date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`;
}

function HighlightedText({ text, tokens }: { text: string; tokens: string[] }) {
  if (tokens.length === 0 || !text) return <>{text}</>;
  const pattern = tokens
    .filter((token) => token.length >= 2)
    .map(escapeRegExp)
    .join("|");
  if (!pattern) return <>{text}</>;

  const parts = text.split(new RegExp(`(${pattern})`, "ig"));
  return (
    <>
      {parts.map((part, index) => {
        const isMatch = tokens.some((token) => normalize(part) === token || normalize(part).includes(token));
        return isMatch ? (
          <mark key={`${part}-${index}`} className="rounded bg-amber-200 px-0.5 text-foreground dark:bg-amber-500/40">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function MarkdownView({ content, tokens }: { content: string; tokens: string[] }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);
  return (
    <article className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === "code") {
          return (
            <pre key={i} className="overflow-auto rounded-lg bg-muted p-3 text-xs">
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.type === "heading") {
          const Heading = `h${Math.min(block.level ?? 2, 4)}` as "h1" | "h2" | "h3" | "h4";
          return (
            <Heading
              key={i}
              id={block.anchor}
              className={cn("scroll-mt-24 font-semibold", block.level === 1 ? "text-xl" : "text-base")}
            >
              <HighlightedText text={block.text} tokens={tokens} />
            </Heading>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {block.items?.map((item, idx) => (
                <li key={idx}>
                  <HighlightedText text={item} tokens={tokens} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "table") {
          return (
            <pre key={i} className="overflow-auto rounded-lg border bg-muted/40 p-3 text-xs">
              {block.text}
            </pre>
          );
        }
        return (
          <p key={i} className="text-muted-foreground">
            <HighlightedText text={block.text} tokens={tokens} />
          </p>
        );
      })}
    </article>
  );
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string; anchor: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; text: string }
  | { type: "table"; text: string };

function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  let table: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: cleanMarkdownText(paragraph.join(" ")) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: list.map(cleanMarkdownText) });
      list = [];
    }
  };
  const flushTable = () => {
    if (table.length) {
      blocks.push({ type: "table", text: table.join("\n") });
      table = [];
    }
  };

  let headingIndex = 0;
  for (const line of lines) {
    if (line.startsWith("```")) {
      if (code) {
        blocks.push({ type: "code", text: code.join("\n") });
        code = null;
      } else {
        flushParagraph();
        flushList();
        flushTable();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      flushTable();
      const text = cleanMarkdownText(heading[2]);
      blocks.push({ type: "heading", level: heading[1].length, text, anchor: slugify(text, headingIndex) });
      headingIndex++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      flushTable();
      list.push(line.replace(/^\s*[-*]\s+/, ""));
      continue;
    }

    if (line.includes("|") && line.trim().startsWith("|")) {
      flushParagraph();
      flushList();
      table.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushTable();
  if (code) blocks.push({ type: "code", text: code.join("\n") });
  return blocks;
}

function slugify(value: string, index: number) {
  const slug = value
    .toLowerCase()
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `section-${index + 1}`;
}

function cleanMarkdownText(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}
