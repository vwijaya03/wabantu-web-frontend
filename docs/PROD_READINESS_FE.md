# Kesiapan produksi frontend — PR #97 dan #98

**Status:** belum merge. Checklist pra-produksi Vercel, bukan catatan rilis. Vercel auto-deploy produksi dari `master`. Jangan ubah Ignored Build Step, env produksi, atau workflow CI.

Branch yang dicek terhadap `origin/master` (`82b5121`): keduanya **0 commit di belakang master** dan `git merge-tree` bersih.

| PR | Branch | HEAD saat checklist ditulis |
|----|--------|------------------------------|
| #97 | `fe/simulator` | `adeb368` |
| #98 | `fe/admin-auth` | `e41f832` |

Keduanya saling menyimpang: #98 kurang 8 commit dari #97, #97 kurang 15 commit dari #98.

## Env produksi (nama saja)

Diisi di Vercel production, bukan di repo.

| Nama | Produksi | Env lomba |
|------|----------|-----------|
| `NEXT_PUBLIC_API_URL` | Same-origin `/api/v1` jika rewrite Vercel mengarah ke Encore produksi. Jangan mengarah ke Cloud Run lomba. | URL API Cloud Run lomba, berakhiran `/api/v1`. |
| `NEXT_PUBLIC_SSE_API_URL` | Kosongkan jika SSE same-origin. Kalau diisi, host API produksi. | Host Cloud Run lomba. Hanya untuk EventSource. |
| `API_BACKEND_URL` / `API_URL_INTERNAL` | Host server-side ke Encore produksi. | Host Cloud Run lomba. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Kosong = UI jatuh ke polling. Kalau diisi, project Firebase produksi. | Web app "WABantu Web (Lomba)", project GCP `wabantu`. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Sama seperti di atas. | Domain project lomba. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Jangan `wabantu` (lomba) dan jangan `wabantu-17052026` kecuali itu memang project produksi yang sudah disetujui. | `wabantu`. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App produksi, atau kosong. | App "WABantu Web (Lomba)". |
| `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_TAGLINE` | Opsional. | Opsional. |

Nilai Firebase web ikut terbundel ke browser. Itu bukan service-account. JSON service account tidak boleh ada di frontend.

## Audit `?access_token=`

Dipakai hanya untuk SSE inbox:

- `lib/inbox/stream-url.ts` menyusun query `access_token` karena `EventSource` tidak bisa mengirim header `Authorization`.
- `hooks/use-inbox-activity-stream.ts` membuka `EventSource` ke URL itu.

`wabantu_access_token` di `lib/auth/session.ts` dan `session-cross-tab.ts` adalah kunci `localStorage`, bukan query string. Tidak ada pemakaian `?access_token=` lain di `#97` atau `#98`. Tidak ada perubahan kode untuk audit ini.

## Regresi UI sebelum merge

- [ ] Login owner/staf di `/login` (bukan terlempar ke login platform admin)
- [ ] Inbox: buka percakapan, kirim balasan, stream aktivitas tetap tersambung
- [ ] Katalog: list dan simpan
- [ ] Order biasa: buat dan ubah, tanpa menyetujui lewat mode pantau
- [ ] Mode pantau: tombol "Setujui pesanan" di halaman Pesanan nonaktif (PR #97)
- [ ] Billing
- [ ] Broadcast
- [ ] `/platform-admin/login` hanya setelah backend #217 hidup; 401 kembali ke login admin

## Urutan merge

Ikut backend: `#216` lalu `#97`, kemudian `#217` lalu `#98` setelah branch FE digabung. Detail ada di `api-go` `docs/PROD_READINESS.md`.
