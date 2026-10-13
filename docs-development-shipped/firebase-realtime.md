# Realtime Firestore (read-only) + fallback polling

- `lib/firebase/client.ts`: `POST /auth/firebase-token` → `signInWithCustomToken`. Firestore hanya dibaca; jika Firebase tidak dikonfigurasi / token 404/503 / sign-in gagal / listener ditolak → polling REST 1,5 dtk (`hooks/use-realtime-collection.ts`).
- **Security M-1:** Auth diinisialisasi dengan `inMemoryPersistence` (tidak ada refresh token di IndexedDB/localStorage; reload = sign-in ulang). IndexedDB lama `firebaseLocalStorageDb` dihapus best-effort saat modul dimuat.
- `firebaseSignOut()`: menutup semua listener terdaftar (hook pindah ke polling, alasan `signed_out`), reset cache sign-in, `signOut(auth)`. Dipanggil saat logout client (`authApi.logout`) dan pada setiap 401 dari klien `api`.
