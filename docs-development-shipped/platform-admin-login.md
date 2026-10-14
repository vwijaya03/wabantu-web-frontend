# Login Platform Admin (superadmin) terpisah — fe/admin-auth

- Halaman: `/platform-admin/login` (app/platform-admin/login/page.tsx). Tidak ditautkan dari `/login` client.
- Endpoint: `POST /api/v1/platform-admin/login` (backend: be/admin-auth di api-go).
- **Kontrak (tetap):** body `{email, password}` → `{accessToken, expiresAt}` (RFC3339). 400 = field kosong, 401 = ditolak (pesan generik), 429 = rate limit atau lockout (`Retry-After` opsional).
- Sesi admin: `lib/auth/admin-session.ts`, **hanya di memori** (module-level + subscribe). Tidak pernah di localStorage/sessionStorage; key lama `wabantu_admin_session` dihapus saat modul dimuat. Saat `expiresAt` lewat: token dihapus dan redirect ke `/platform-admin/login?next=…`. **Reload / tab baru = login ulang.**
- `lib/api/admin-client.ts` (`adminApi`): dipakai `lib/api/ai-providers.ts` untuk `/admin/ai/*`. 401 → hapus sesi admin,
  redirect ke `/platform-admin/login?next=…`.
- Error ditampilkan apa adanya: 400/401/429/404 ("endpoint belum tersedia")/5xx ("Gagal, coba lagi"). Password tidak pernah di-log.
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
- Kode error login admin: 200 `{accessToken, expiresAt}`; 400 field kosong; 401 generik ("Email atau password salah"); 429 = rate limit **atau** lockout. Body error memakai field `error`, UI tetap menampilkan pesan generik sendiri.
- Tidak ada refresh token: token admin 60 menit / sesi absolut 2 jam → 401 dari `/admin/*` = login ulang.
- "Pantau" tenant: `POST /admin/impersonate/:tenantId` → `{ok, tenant, accessToken, expiresAt}` (30 menit). Token disimpan **hanya di memori** (`lib/auth/impersonation-session.ts`), dipasang klien tenant `api` (prioritas di atas token client), tidak pernah dikirim ke `/admin/*` (`adminApi` hanya token admin). Kedaluwarsa → token dihapus, toast, `stop-impersonation` (best-effort, token admin), kembali ke `/dashboard/admin`. 401 di endpoint tenant saat pantau → token dihapus, kembali ke konsol. Stop manual juga menghapus token.
- `/flags/*` (kecuali `/flags/check/:key`) kini admin-only → semua lewat `adminApi`. FE belum punya klien `GET /audit/logs`.
- Login client: super_admin kini 401 → form menampilkan pesan generik (401/429/5xx); redirect super_admin ke `/dashboard/admin` dihapus. Tidak ada tautan ke login admin.

## Tahap 4: identitas admin via /platform-admin/me
- Klien `api` hanya memasang token impersonation (Pantau) atau token client; token admin tidak pernah ke endpoint client/tenant.
- Identitas konsol admin: `GET /api/v1/platform-admin/me` (token admin saja, `{id, email, name, role}`) lewat `adminApi` (`platformAdminMe()`), dipetakan ke `AuthUser {role:"super_admin", platform:true}`.
- `lib/auth/load-session-user.ts`: routing shell berdasarkan sesi yang ada — `tenant` (impersonation/client → `/auth/me`), `admin` (hanya admin → `/platform-admin/me`), `none` (rute `/dashboard/admin/**` → `/platform-admin/login?next=`, lainnya → `/login?next=`). `DashboardAuthShell` dan `AuthProvider.refresh` memakainya; admin-only tidak lagi dipantulkan ke `/login`.
- `/platform-admin/me`: 401 → interceptor `adminApi` menghapus sesi admin + redirect login admin; 404 → layar "Endpoint belum tersedia" (endpoint belum di-merge di BE).
- Logout ("Keluar") saat sesi admin saja → hapus sesi admin, ke `/platform-admin/login`.
- Perbaikan bug: path login admin sebelumnya `/api/v1/platform-admin/login` padahal `baseURL` sudah `/api/v1` (jadi dobel). Sekarang `/platform-admin/login`.

## Tahap 5: Firebase sign-out (Security M-1)
- Merge `fe/simulator` (persistence in-memory, `firebaseSignOut()` saat logout client & setiap 401 klien `api`; lihat `firebase-realtime.md`).
- `clearAdminSession()` dan `clearImpersonationSession()` memanggil `firebaseSignOut()` → tercakup: stop-impersonation, token Pantau kedaluwarsa, 401 saat Pantau, logout admin ("Keluar"/"Keluar admin"), 401/kedaluwarsa sesi admin.

## Tahap 6: fix redirect ke /login saat sesi admin-only
- Gejala: setelah login admin, `/dashboard/admin/*` terlempar ke `/login?next=…` client.
- Akar masalah: `NotificationBell` (topbar) memanggil `GET /notifications` lewat klien tenant `api` tanpa token → 401 → interceptor `api` (`lib/api/client.ts`, cabang "tanpa token") `redirectToLogin()`.
- Fix: query notifikasi hanya `enabled` bila `currentSessionKind() === "tenant"` (client atau Pantau). Sesi admin-only tidak memanggil endpoint tenant.

## Tahap 7: logout admin me-revoke token di BE
- `adminLogout()` (`lib/api/admin-client.ts`): `POST /api/v1/auth/logout` lewat `adminApi` (token admin), best-effort (timeout 5 dtk, error diabaikan, 401 tidak memicu redirect), lalu `clearAdminSession()` selalu dijalankan.
- Dipakai oleh "Keluar admin" (`useAdminSession().logoutAdmin`) dan "Keluar" saat sesi admin-only (`AuthProvider.logout`). Kedaluwarsa/401 tetap hanya hapus lokal.
- `/auth/reauth` hanya dipanggil dari dialog reauth sesi client dengan token client di body (`skipAuthHeader`); token impersonasi/admin tidak pernah dikirim ke `/auth/reauth`.

## Tahap 8: Firebase sign-out saat Pantau dimulai + 403 firebase-token
- `setImpersonationSession()` kini memanggil `firebaseSignOut()` (best-effort) saat Pantau dimulai, agar listener/sesi Firebase dari sesi sebelumnya tidak terbawa. Stop/kedaluwarsa Pantau (`clearImpersonationSession`) dan logout admin (`clearAdminSession`) sudah memanggilnya sejak Tahap 5. `firebaseSignOut()` aman tanpa konfigurasi Firebase (`authInstance` null → return).
- 403 dari `POST /auth/firebase-token` (mis. sesi impersonate): `ensureFirebaseSignIn()` melempar `RealtimeUnavailableError("auth_failed")`, `useRealtimeCollection` jatuh ke polling REST. Interceptor `api` tidak bereaksi pada 403 (tanpa redirect/logout/toast/console).
