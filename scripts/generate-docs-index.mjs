import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const webRoot = path.resolve(path.dirname(__filename), "..");
const repoRoot = path.resolve(webRoot, "..");
const outputDir = path.join(webRoot, "public", "generated-docs");
const outputFile = path.join(outputDir, "docs-index.json");
const apiGoDocsRootInput = process.env.API_GO_DOCS_ROOT?.trim() || "../api-go";
const apiGoDocsRoot = process.env.API_GO_DOCS_ROOT
  ? path.resolve(webRoot, apiGoDocsRootInput)
  : path.join(repoRoot, "api-go");
const apiGoDocsIndexUrl = process.env.API_GO_DOCS_INDEX_URL?.trim();

const sources = [
  { key: "api-go", root: apiGoDocsRoot },
  { key: "web-frontend", root: webRoot },
];

const ignoredDirs = new Set([
  ".git",
  ".next",
  "node_modules",
  "public",
  "coverage",
  "dist",
  "build",
]);

function listMarkdownFiles(dir) {
  const entries = readdirSync(dir).sort((a, b) => a.localeCompare(b));
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (!ignoredDirs.has(entry)) {
        files.push(...listMarkdownFiles(fullPath));
      }
      continue;
    }
    if (entry.toLowerCase().endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function titleFromMarkdown(content, fallback) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return cleanInlineMarkdown(heading);
  return fallback
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanInlineMarkdown(value) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function plainText(content) {
  return cleanInlineMarkdown(
    content
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*]\s+/gm, "")
      .replace(/[>|#*_~]/g, " ")
      .replace(/\s+/g, " "),
  );
}

function extractHeadings(content) {
  const matches = Array.from(content.matchAll(/^(#{1,4})\s+(.+)$/gm));
  return matches.map((m, index) => {
    const text = cleanInlineMarkdown(m[2]);
    const start = m.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    const sectionText = plainText(content.slice(start, end));
    return {
      level: m[1].length,
      text,
      anchor: slugify(text, index),
      excerpt: makeExcerpt(sectionText),
      searchText: normalizeSearch(`${text} ${sectionText}`),
    };
  });
}

function inferCategory(relativePath, title, content) {
  const text = `${relativePath} ${title} ${content.slice(0, 2000)}`.toLowerCase();
  if (text.includes("finance") || text.includes("billing") || text.includes("quota")) return "Finance & Billing";
  if (text.includes("platform admin") || text.includes("superadmin") || text.includes("tenant")) return "Platform Admin";
  if (text.includes("whatsapp") || text.includes("meta")) return "WhatsApp";
  if (text.includes("api") || text.includes("endpoint") || text.includes("curl")) return "API";
  if (text.includes("onboarding") || text.includes("product")) return "Product";
  if (text.includes("developer") || text.includes("architecture") || text.includes("migration")) return "Engineering";
  return "General";
}

function makeExcerpt(text) {
  const trimmed = text.trim();
  return trimmed.length > 220 ? `${trimmed.slice(0, 220)}...` : trimmed;
}

function normalizeSearch(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function slugify(value, index) {
  const slug = value
    .toLowerCase()
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `section-${index + 1}`;
}

function createDoc(source, filePath) {
  const relativePath = path.relative(source.root, filePath).replaceAll(path.sep, "/");
  const stat = statSync(filePath);
  const content = readFileSync(filePath, "utf8");
  const title = titleFromMarkdown(content, path.basename(filePath));
  const text = plainText(content);
  const id = createHash("sha1").update(`${source.key}:${relativePath}`).digest("hex").slice(0, 12);
  return {
    id,
    source: source.key,
    path: relativePath,
    title,
    category: inferCategory(relativePath, title, content),
    headings: extractHeadings(content),
    excerpt: makeExcerpt(text),
    content,
    text,
    searchText: `${source.key} ${relativePath} ${title} ${text}`.toLowerCase(),
    modifiedAtMs: stat.mtimeMs,
  };
}

const localDocs = sources.flatMap((source) => {
  if (!statExists(source.root)) return [];
  return listMarkdownFiles(source.root).map((filePath) => createDoc(source, filePath));
});
const remoteDocs = await fetchRemoteDocs(apiGoDocsIndexUrl);
const docs = mergeDocs(localDocs, remoteDocs);

const payload = {
  generatedAt: new Date(Math.max(...docs.map((d) => d.modifiedAtMs), 0)).toISOString(),
  sources: Array.from(new Set(docs.map((d) => d.source))).sort(),
  totalDocs: docs.length,
  docs: docs.map(stripInternalFields),
  config: {
    apiGoDocsRoot: apiGoDocsRootInput,
    apiGoDocsIndexUrl: apiGoDocsIndexUrl || "",
  },
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Generated ${docs.length} docs -> ${path.relative(webRoot, outputFile)}`);

function statExists(target) {
  try {
    statSync(target);
    return true;
  } catch {
    return false;
  }
}

function stripInternalFields(doc) {
  const clean = { ...doc };
  delete clean.modifiedAtMs;
  return clean;
}

async function fetchRemoteDocs(url) {
  if (!url) return [];
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Skipping remote docs index ${url}: HTTP ${res.status}`);
      return [];
    }
    const payload = await res.json();
    if (!Array.isArray(payload.docs)) return [];
    return payload.docs.map((doc) => ({
      ...doc,
      id: doc.id || createHash("sha1").update(`${doc.source}:${doc.path}`).digest("hex").slice(0, 12),
      modifiedAtMs: Date.parse(payload.generatedAt || doc.updatedAt || "") || 0,
    }));
  } catch (err) {
    console.warn(`Skipping remote docs index ${url}: ${err.message}`);
    return [];
  }
}

function mergeDocs(localDocs, remoteDocs) {
  const byKey = new Map();
  for (const doc of [...localDocs, ...remoteDocs]) {
    byKey.set(`${doc.source}:${doc.path}`, doc);
  }
  return Array.from(byKey.values()).sort((a, b) =>
    `${a.source}/${a.path}`.localeCompare(`${b.source}/${b.path}`),
  );
}
