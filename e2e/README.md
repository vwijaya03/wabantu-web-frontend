# E2E Playwright — wabantu-web-frontend

Spec di `e2e/specs/`, config di `playwright.config.ts`. Target & kredensial **hanya dari env** (jangan commit nilai apa pun; taruh di shell atau `.env.e2e.local` yang sudah ter-ignore oleh `.env*`).

## Jalankan (lokal)
```bash
nvm install 24.22.1 && nvm use 24.22.1   # sesuai .nvmrc; jangan Node 25
npx playwright install --with-deps chromium   # sekali
npm run dev                                   # FE :3000, rewrite /api/v1 → API_BACKEND_URL (default :4000)
# terminal lain (backend: encore run di api-go)
E2E_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:4000 \
E2E_CLIENT_EMAIL=... E2E_CLIENT_PASSWORD=... npm run e2e
```
Cloud Run: ganti `E2E_BASE_URL` (URL FE) dan `E2E_API_BASE_URL` (URL api-go) saja.

## Env
| Var | Wajib untuk | Keterangan |
|---|---|---|
| `E2E_BASE_URL` | semua | default `http://localhost:3000` |
| `E2E_LOCAL_RESET` | opsional | `1` = globalSetup SCAN+DEL `login:*:fail:*`, `login:*:lock:*`, `rl:auth:*` di Redis lokal. Ditolak jika target bukan localhost. |
| `E2E_API_BASE_URL` | 1–6 | api-go langsung, default `http://localhost:4000`. Tidak terjangkau → spec backend **SKIP** |
| `E2E_CLIENT_EMAIL` / `E2E_CLIENT_PASSWORD` | 1, 5, 6 | akun owner tenant demo (harus boleh "Setujui pesanan") |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | 2, 3, 4 | superadmin (dibuat via bootstrap key lokal, bukan key yang bocor) |
| `E2E_LOCKOUT_EMAIL` | 2 (lockout) | email buangan; akan terkunci ±15 menit. Jangan akun admin asli |
| `E2E_LOCKOUT_ATTEMPTS` | 2 | default 10 |
| `E2E_IMPERSONATE_TENANT` | 3 | companyName tenant yang aksesnya sudah **disetujui owner** (tombol Pantau muncul) |
| `E2E_TARGET_PROVIDER` | 4 | `gemini` (default) / `anthropic` / `openai` |
| `E2E_ORDER_MESSAGE` | 5 | pesan reseller yang memicu order dari katalog seed, mis. "pesan 2 <produk>" |
| `E2E_EXPECTED_TIER` / `E2E_EXPECTED_UNIT_PRICE` | 5 (opsional) | label tier & teks harga satuan (mis. `Rp 45.000`) yang diharapkan |

## Data seed yang dibutuhkan
- Tenant demo + owner (client login), kontak `reseller-demo` terhubung tier reseller, katalog dengan 3 tingkat harga.
- Superadmin; tenant dengan access-request yang sudah disetujui (untuk Pantau).
- Provider target (mis. Gemini) punya API key di backend.

## Artefak
`e2e-artifacts/` (gitignored): `test-results/<test>/trace.zip` (trace selalu), screenshot tiap langkah (attachment) + akhir, video saat gagal, `html-report/`, `results.json`.
Buka trace: `npx playwright show-trace e2e-artifacts/test-results/<dir>/trace.zip`.

## Catatan
- Sesi superadmin hanya di memori: spec menavigasi client-side setelah login admin (reload = login ulang).
- Skenario 4: UI simulator tidak menampilkan provider; spec memverifikasi PUT config berhasil & simulator tetap membalas. Bukti provider yang dipakai: log backend / ai-activity / DB (QA).
- Skenario 1: bila Firebase tidak dikonfigurasi, cek IndexedDB `firebaseLocalStorageDb` tetap 0 — revoke Firebase asli = UNVERIFIED.

## Catatan run lokal (13 Okt 2026)
- Dev server: `NEXT_PUBLIC_API_URL` **harus** berakhiran `/api/v1` (mis. `http://127.0.0.1:4000/api/v1`). `lib/env.ts` tidak menambah prefix untuk `apiUrl` (hanya untuk SSE), jadi tanpa `/api/v1` login client/admin kena 404 ("Endpoint login admin belum tersedia di backend").
- Spec 2: body response login dibaca di dalam predicate `waitForResponse` (FE langsung navigasi setelah login); alert dipilih via `p[role=alert]` karena Next punya `#__next-route-announcer__` dengan role alert juga.
- Spec 5: harga dicek dengan format UI `@ Rp 72.000` (atau angka polos); badge tingkat jadi `expect.soft`; bila bot minta nama + HP penerima, spec mengirim data sintetis (1 pesan, hemat rate limit simulator 20/menit).
- `e2e-artifacts/` berisi page snapshot yang memuat password akun uji: jangan di-commit/diunggah.
