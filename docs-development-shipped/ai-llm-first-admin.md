# Halaman admin AI LLM-first

- Rute: `/dashboard/admin/ai-llm-first` (gate `useAdminSession()`, sesi superadmin; menu Platform "AI LLM-first").
- API client: `lib/api/llm-first.ts` (lewat `adminApi`): `GET/POST /flags`, `PATCH /flags/:key`, `GET /admin/ai/llm-first/usage`.
- Flag: `ai_llm_first` (on, per tenant), `ai_llm_first_shadow` (shadow), `ai_llm_first_kill` (kill switch, `enabledGlobally=true` mematikan semua).
- Mode tenant: `on` menang atas `shadow`; di luar keduanya `off`. Mengubah mode = re-fetch `GET /flags`, lalu `PATCH` `tenantIds` (mengganti seluruh daftar) pada flag yang berubah; flag yang belum ada dibuat dulu lewat `POST /flags`.
- Perubahan flag butuh hingga 60 detik (cache TTL backend). Konfirmasi dialog untuk kill switch dan untuk mode `on`.
- Panel pemakaian: total, rata-rata per pesan (IDR/USD), tabel per hari, per model; 404/kosong ditampilkan sebagai "belum ada data".
- Catatan: tidak ada test runner unit di repo (hanya Playwright), jadi tidak ada unit test.
