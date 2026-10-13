# Login Platform Admin (superadmin) terpisah — fe/admin-auth

- Halaman: `/platform-admin/login` (app/platform-admin/login/page.tsx). Tidak ditautkan dari `/login` client.
- Endpoint: `POST /api/v1/platform-admin/login` (backend: be/admin-auth di api-go).
- **Asumsi kontrak** (belum ada kode/doc di be/admin-auth saat ditulis): body `{email, password}`;
  respons `{accessToken|token, expiresAt?, expiresIn?}`; 429 = rate limit (`Retry-After` opsional), 423 = akun terkunci,
  401/403 = kredensial salah / bukan superadmin. Sesuaikan `lib/api/admin-client.ts` begitu doc BE ada.
- Sesi admin: `lib/auth/admin-session.ts`, disimpan di `sessionStorage` (bukan localStorage client), TTL lokal
  mengikuti server, fallback 30 menit. Terpisah total dari token client.
- `lib/api/admin-client.ts` (`adminApi`): dipakai `lib/api/ai-providers.ts` untuk `/admin/ai/*`. 401 → hapus sesi admin,
  redirect ke `/platform-admin/login?next=…`.
- Error ditampilkan apa adanya: 429/423/401/404 ("endpoint belum tersedia")/5xx ("Gagal, coba lagi"). Password tidak pernah di-log.
- Security: satu pesan generik untuk email/password salah (juga untuk akun bukan superadmin); pesan server tidak ditampilkan; password/token tidak pernah di-log atau ditampilkan; key sesi admin `wabantu_admin_session` ≠ client `wabantu_access_token`; adminApi hanya untuk /admin/*, klien `api` tidak membawa token admin.

## Tahap 2: semua /admin/* pakai sesi admin
- Semua panggilan `/admin/*` lewat `adminApi` (alias `adminHttp`): `lib/api/admin.ts` (tenants, plan, delete, migrate schemas, impersonate/stop-impersonation),
  `ai-activity.ts`, `ai-regression.ts`, `ai-triage.ts`, `flags.ts` (hanya `/admin/ai-retrieval/incidents`), `tenant-access.ts` (hanya `/admin/tenant-access-requests`),
  `ai-providers.ts`. Endpoint non-admin di file yang sama tetap pakai `api` (sesi client).
- Gate halaman `app/(dashboard)/dashboard/admin/**` dan menu Platform (sidebar) serta item superadmin di topbar memakai `useAdminSession()`
  (`hooks/use-admin-session.ts`), bukan `user.role` sesi client. Tanpa sesi admin → `AdminSessionRequired` (tautan ke `/platform-admin/login?next=…`).
- Logout admin: item "Keluar admin" di menu topbar → `clearAdminSession()` saja; sesi client tidak disentuh.
- `proxy.ts`: matcher mencakup `/platform-admin/:path*`, tetap passthrough (sesi admin ada di sessionStorage, tidak terlihat di edge).
- Catatan/gap: halaman `/dashboard/admin/*` masih di dalam `DashboardAuthShell`, jadi tetap butuh sesi client juga.
  Impersonasi (`/admin/impersonate`) kini dikirim dengan token admin; perlu dicek ke BE apakah respons/efeknya masih mengikat sesi client.
  Halaman lain yang memakai `super_admin` (docs, knowledge-base/setup, finance/transaction-types, login-form, auth-shell) tidak diubah.
