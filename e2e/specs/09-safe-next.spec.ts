import { test, expect } from "@playwright/test";
import { DEFAULT_LOGIN_NEXT, safeNext } from "../../lib/auth/safe-next";

/**
 * Tanpa backend/browser. `?next=` di /login dan /platform-admin/login harus hanya menerima
 * path relatif same-origin (cegah open redirect & XSS `javascript:` setelah login).
 */
const FALLBACK = DEFAULT_LOGIN_NEXT;

const rejected: Array<[string, unknown]> = [
  ["URL absolut https", "https://evil.com"],
  ["URL absolut http", "http://evil.com/dashboard"],
  ["protocol-relative //", "//evil.com"],
  ["protocol-relative /// ", "///evil.com"],
  ["backslash /\\", "/\\evil.com"],
  ["backslash \\\\", "\\\\evil.com"],
  ["backslash \\", "\\evil.com"],
  ["javascript:", "javascript:alert(1)"],
  ["JaVaScRiPt: (case)", "JaVaScRiPt:alert(document.cookie)"],
  ["data:", "data:text/html,<script>alert(1)</script>"],
  ["skema lain (vbscript:)", "vbscript:msgbox(1)"],
  ["spasi di depan", " /dashboard"],
  ["spasi di depan + javascript", "  javascript:alert(1)"],
  ["tab di tengah /\\t/", "/\t/evil.com"],
  ["newline di tengah /\\n/", "/\n/evil.com"],
  ["karakter kontrol NUL", "/dash\u0000board"],
  ["encoded //", "/%2F%2Fevil.com"],
  ["encoded /\\", "/%5Cevil.com"],
  ["double-encoded //", "/%252F%252Fevil.com"],
  ["encoding rusak", "/%E0%A4%A"],
  ["path tanpa slash", "dashboard"],
  ["string kosong", ""],
  ["null", null],
  ["undefined", undefined],
  ["bukan string (angka)", 42],
  ["bukan string (array)", ["/dashboard"]],
];

test.describe("safeNext (validasi ?next= saat login)", () => {
  for (const [name, input] of rejected) {
    test(`ditolak → fallback: ${name}`, () => {
      expect(safeNext(input)).toBe(FALLBACK);
    });
  }

  test("path valid dengan query + hash dipertahankan", () => {
    expect(safeNext("/dashboard/events?tab=people#x")).toBe("/dashboard/events?tab=people#x");
  });

  test("path valid sederhana dipertahankan", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
    expect(safeNext("/dashboard/admin?impersonationEnded=1")).toBe("/dashboard/admin?impersonationEnded=1");
  });

  test("encoded biasa di query tetap diterima", () => {
    expect(safeNext("/dashboard/inbox?q=a%20b")).toBe("/dashboard/inbox?q=a%20b");
  });

  test("fallback kustom (platform admin)", () => {
    const admin = "/dashboard/admin/ai-providers";
    expect(safeNext(null, admin)).toBe(admin);
    expect(safeNext("//evil.com", admin)).toBe(admin);
    expect(safeNext("/dashboard/admin/tenants", admin)).toBe("/dashboard/admin/tenants");
  });

  test("hasil tidak pernah membawa origin", () => {
    const out = safeNext("/a/../dashboard?x=1");
    expect(out.startsWith("/")).toBe(true);
    expect(out.startsWith("//")).toBe(false);
    expect(out).toBe("/dashboard?x=1");
  });
});
