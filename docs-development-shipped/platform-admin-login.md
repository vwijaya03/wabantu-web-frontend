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
- Gap: endpoint `/admin/*` lain (lib/api/admin.ts, flags, ai-triage, dll.) masih pakai sesi client; menu superadmin di dashboard masih bergantung pada `user.role` sesi client.
- Security: satu pesan generik untuk email/password salah (juga untuk akun bukan superadmin); pesan server tidak ditampilkan; password/token tidak pernah di-log atau ditampilkan; key sesi admin `wabantu_admin_session` ≠ client `wabantu_access_token`; adminApi hanya untuk /admin/*, klien `api` tidak membawa token admin.
