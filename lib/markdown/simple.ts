/** Ringkas markdown untuk preview satu baris di tabel. */
export function plainTextFromMarkdown(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

/** Render markdown sederhana untuk preview editor (tanpa dependency eksternal). */
export function renderSimpleMarkdown(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .split("\n")
    .map((line) => {
      const bullet = line.match(/^[-*]\s+(.*)$/);
      if (bullet) {
        return `<li>${inlineMarkdown(bullet[1])}</li>`;
      }
      const numbered = line.match(/^\d+\.\s+(.*)$/);
      if (numbered) {
        return `<li>${inlineMarkdown(numbered[1])}</li>`;
      }
      if (line.trim() === "") {
        return "<br />";
      }
      return `<p>${inlineMarkdown(line)}</p>`;
    })
    .join("")
    .replace(/(<li>.*?<\/li>)+/g, (block) => `<ul class="list-disc pl-5 my-1">${block}</ul>`);
}

function inlineMarkdown(line: string): string {
  return line
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export function wrapSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string,
): { next: string; cursor: number } {
  const selected = value.slice(selectionStart, selectionEnd);
  const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  const cursor = selectionStart + before.length + selected.length + after.length;
  return { next, cursor };
}

export function prefixSelectedLines(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
): { next: string; cursor: number } {
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEnd = value.indexOf("\n", selectionEnd);
  const end = lineEnd === -1 ? value.length : lineEnd;
  const block = value.slice(lineStart, end);
  const lines = block.split("\n");
  const prefixed = lines.map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`)).join("\n");
  const next = value.slice(0, lineStart) + prefixed + value.slice(end);
  return { next, cursor: lineStart + prefixed.length };
}
