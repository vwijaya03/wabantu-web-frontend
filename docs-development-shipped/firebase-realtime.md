# Realtime Firestore (read-only) + fallback polling

- `lib/firebase/client.ts`: `POST /auth/firebase-token` → `signInWithCustomToken`. Firestore hanya dibaca; jika Firebase tidak dikonfigurasi / token 404/503 / sign-in gagal / listener ditolak → polling REST 1,5 dtk (`hooks/use-realtime-collection.ts`).
- **Security M-1:** Auth diinisialisasi dengan `inMemoryPersistence` (tidak ada refresh token di IndexedDB/localStorage; reload = sign-in ulang). IndexedDB lama `firebaseLocalStorageDb` dihapus best-effort saat modul dimuat.
- `firebaseSignOut()`: menutup semua listener terdaftar (hook pindah ke polling, alasan `signed_out`), reset cache sign-in, `signOut(auth)`. Dipanggil saat logout client (`authApi.logout`) dan pada setiap 401 dari klien `api`.

## Catatan: revoke Firebase berlaku per akun

Saat logout atau kena 401, backend me-revoke refresh token Firebase **per akun (uid)**, bukan per device. Akibatnya logout di satu device ikut memutus realtime Firestore di device lain milik user yang sama. Device lain itu tidak error: listener jatuh ke fallback REST polling dan halaman tetap jalan, hanya update tidak lagi instan sampai user login ulang.

## Catatan: `public/generated-docs/docs-index.json`

Di-generate oleh `scripts/generate-docs-index.mjs` (`predev`/`prebuild`). Doc `api-go` dibaca dari `../api-go` (atau `API_GO_DOCS_ROOT` / `API_GO_DOCS_INDEX_URL`). Kalau sumber itu tidak ada (worktree, CI, Vercel), generator kini mempertahankan doc `api-go` dari index yang sudah di-commit, sehingga index tidak lagi menyusut diam-diam.
