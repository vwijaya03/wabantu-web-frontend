# Login Platform Admin (superadmin) terpisah — fe/admin-auth

- Halaman: `/platform-admin/login` (app/platform-admin/login/page.tsx). Tidak ditautkan dari `/login` client.
- Endpoint: `POST /api/v1/platform-admin/login` (backend: be/admin-auth di api-go).
- **Kontrak (tetap):** body `{email, password}` → `{accessToken, expiresAt}` (RFC3339). 429 = rate limit (`Retry-After` opsional), 423 = lockout, 401/403 = ditolak (pesan generik).
- Sesi admin: `lib/auth/admin-session.ts`, **hanya di memori** (module-level + subscribe). Tidak pernah di localStorage/sessionStorage; key lama `wabantu_admin_session` dihapus saat modul dimuat. Saat `expiresAt` lewat: token dihapus dan redirect ke `/platform-admin/login?next=…`. **Reload / tab baru = login ulang.**
- `lib/api/admin-client.ts` (`adminApi`): dipakai `lib/api/ai-providers.ts` untuk `/admin/ai/*`. 401 → hapus sesi admin,
  redirect ke `/platform-admin/login?next=…`.
- Error ditampilkan apa adanya: 429/423/401/404 ("endpoint belum tersedia")/5xx ("Gagal, coba lagi"). Password tidak pernah di-log.
- Security: satu pesan generik untuk email/password salah (juga untuk akun bukan superadmin); pesan server tidak ditampilkan; password/token tidak pernah di-log atau ditampilkan; sesi admin hanya di memori (bukan storage), sesi client `wabantu_access_token` di localStorage; adminApi hanya untuk /admin/*, klien `api` tidak membawa token admin.

## Tahap 2: semua /admin/* pakai sesi admin
- Semua panggilan `/admin/*` lewat `adminApi` (alias `adminHttp`): `lib/api/admin.ts` (tenants, plan, delete, migrate schemas, impersonate/stop-impersonation),
  `ai-activity.ts`, `ai-regression.ts`, `ai-triage.ts`, `flags.ts` (hanya `/admin/ai-retrieval/incidents`), `tenant-access.ts` (hanya `/admin/tenant-access-requests`),
  `ai-providers.ts`. Endpoint non-admin di file yang sama tetap pakai `api` (sesi client).
- Gate halaman `app/(dashboard)/dashboard/admin/**` dan menu Platform (sidebar) serta item superadmin di topbar memakai `useAdminSession()`
  (`hooks/use-admin-session.ts`), bukan `user.role` sesi client. Tanpa sesi admin → `AdminSessionRequired` (tautan ke `/platform-admin/login?next=…`).
- Logout admin: item "Keluar admin" di menu topbar → `clearAdminSession()` saja; sesi client tidak disentuh.
- `proxy.ts`: matcher mencakup `/platform-admin/:path*`, tetap passthrough (sesi admin hanya di memori browser, tidak terlihat di edge).
- Catatan/gap: halaman `/dashboard/admin/*` masih di dalam `DashboardAuthShell`, jadi tetap butuh sesi client juga.
  Impersonasi (`/admin/impersonate`) kini dikirim dengan token admin; perlu dicek ke BE apakah respons/efeknya masih mengikat sesi client.
  Halaman lain yang memakai `super_admin` (docs, knowledge-base/setup, finance/transaction-types, login-form, auth-shell) tidak diubah.
- Impersonasi: `/admin/impersonate` tidak mengembalikan token yang disimpan FE; `adminApi` hanya memasang `getAdminToken()` sehingga token client/impersonasi tidak pernah dikirim ke `/admin/*`, dan token admin tidak pernah dikirim ke endpoint client.
