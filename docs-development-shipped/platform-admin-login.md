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

## Tahap 3: selaras dengan api-go `docs/ADMIN_AUTH.md` (PR #217, d37f17e)
- Kode error login admin: 200 `{accessToken, expiresAt}`; 400 field kosong; 401 generik ("Email atau password salah"); 429 = rate limit **atau** lockout (tidak ada 423 — penanganan 423 dihapus). Body error memakai field `error`, UI tetap menampilkan pesan generik sendiri.
- Tidak ada refresh token: token admin 60 menit / sesi absolut 2 jam → 401 dari `/admin/*` = login ulang.
- "Pantau" tenant: `POST /admin/impersonate/:tenantId` → `{ok, tenant, accessToken, expiresAt}` (30 menit). Token disimpan **hanya di memori** (`lib/auth/impersonation-session.ts`), dipasang klien tenant `api` (prioritas di atas token client), tidak pernah dikirim ke `/admin/*` (`adminApi` hanya token admin). Kedaluwarsa → token dihapus, toast, `stop-impersonation` (best-effort, token admin), kembali ke `/dashboard/admin`. 401 di endpoint tenant saat pantau → token dihapus, kembali ke konsol. Stop manual juga menghapus token.
- `/flags/*` (kecuali `/flags/check/:key`) kini admin-only → semua lewat `adminApi`. FE belum punya klien `GET /audit/logs`.
- Login client: super_admin kini 401 → form menampilkan pesan generik (401/429/5xx); redirect super_admin ke `/dashboard/admin` dihapus. Tidak ada tautan ke login admin.
- **Pengecualian (perlu review Security):** `GET /auth/me` memakai token admin hanya bila tidak ada token impersonation/client, agar `DashboardAuthShell` bisa memuat konsol admin tanpa sesi client (doc: `/auth/me` raw, tidak lewat middleware). Belum diverifikasi ke backend.
- Gap: 401 di `/auth/me` untuk admin masih diarahkan ke `/login` client (bukan login admin); `dashboard-auth-shell` masih punya guard berbasis `role` dari `/auth/me` (kini berasal dari token admin/impersonation, bukan sesi client).
