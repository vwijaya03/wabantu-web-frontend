/**
 * Validasi parameter `?next=` (tujuan setelah login) supaya tidak bisa dipakai untuk
 * open redirect ke situs luar atau XSS lewat skema `javascript:` / `data:`.
 *
 * Aturan: hanya path relatif same-origin yang diterima (diawali satu `/`). Ditolak:
 * - URL absolut / skema apa pun (`https:`, `javascript:`, `data:`, …)
 * - protocol-relative `//host` dan varian backslash (`/\host`, `\host`)
 * - whitespace / karakter kontrol di mana pun (spasi di depan, tab, newline — browser
 *   membuang tab/newline sehingga `/\t/evil.com` menjadi `//evil.com`)
 * - varian ter-encode yang setelah decode menjadi `//` atau mengandung backslash/kontrol
 * Input non-string, kosong, atau tidak valid → `fallback`.
 * Hasil hanya `pathname + search + hash` hasil parse URL (tanpa origin).
 */
export const DEFAULT_LOGIN_NEXT = "/dashboard";

const PARSE_BASE = "https://x.invalid";
const MAX_NEXT_LENGTH = 2048;
// Whitespace (termasuk Unicode), karakter kontrol C0/C1, dan backslash.
const FORBIDDEN_CHARS = /[\s\u0000-\u001f\u007f-\u009f\\]/;

function isSinglySlashed(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function decodedLooksUnsafe(value: string): boolean {
  let current = value;
  // Decode beberapa lapis (mis. %252F%252F) untuk menangkap varian ter-encode.
  for (let i = 0; i < 3; i++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return true; // encoding rusak → tolak
    }
    if (!isSinglySlashed(decoded) || FORBIDDEN_CHARS.test(decoded)) return true;
    if (decoded === current) return false;
    current = decoded;
  }
  return false;
}

export function safeNext(raw: unknown, fallback: string = DEFAULT_LOGIN_NEXT): string {
  if (typeof raw !== "string") return fallback;
  if (raw.length === 0 || raw.length > MAX_NEXT_LENGTH) return fallback;
  if (!isSinglySlashed(raw) || FORBIDDEN_CHARS.test(raw)) return fallback;

  let url: URL;
  try {
    url = new URL(raw, PARSE_BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== PARSE_BASE) return fallback;

  const result = `${url.pathname}${url.search}${url.hash}`;
  if (!isSinglySlashed(result)) return fallback;
  if (decodedLooksUnsafe(url.pathname)) return fallback;
  return result;
}
