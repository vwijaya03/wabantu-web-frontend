# Shipped: Media WhatsApp di Inbox (Fase 1)

**Status:** Siap merge  
**Branch:** `feat/inbox-media`  
**PR:** [#25](https://github.com/vwijaya03/wabantu-web-frontend/pull/25)  
**Tanggal:** 2026-06  
**Backend:** [api-go PR #35](https://github.com/vwijaya03/wabantu-api-go/pull/35) — [`api-go/shipped/inbox-media-fase1.md`](../../api-go/shipped/inbox-media-fase1.md)

---

## Apa yang di-ship

Bubble pesan Inbox menampilkan **gambar** dari WhatsApp (lazy load via API proxy), caption di bawah gambar, dan lightbox saat diklik.

Tipe lain (`video`, `audio`, `document`): placeholder teks v1 — belum player/preview penuh.

---

## Perubahan UI

| File | Perubahan |
|------|-----------|
| `components/inbox/inbox-message-bubble.tsx` | Render `image` + lightbox; fetch blob autentikasi |
| `lib/api/inbox.ts` | Type `media`, `fetchMessageMediaBlob` |
| `app/(dashboard)/dashboard/inbox/page.tsx` | Pakai `InboxMessageBubble`; `key={message.id}` untuk reset state media |

### Alur load gambar

1. `GetMessages` mengembalikan `media.url` (path relatif ke API).
2. Komponen memanggil `fetchMessageMediaBlob(url)` dengan JWT.
3. Object URL dibuat untuk `<img>`; dibersihkan saat unmount / ganti pesan.

---

## Yang belum (bukan bug Fase 1)

- AI tidak membalas pesan gambar **sampai** backend `feat/ai-image-caption` merge (caption → text).
- Video/audio/document: hanya label placeholder.

---

## Test manual

1. Merge/deploy api-go #35 dulu, lalu frontend #25.
2. Buka Inbox → percakapan dengan gambar WA → gambar tampil.
3. Klik gambar → lightbox.
4. Kirim gambar + caption → caption terlihat di bubble.

---

## Catatan teknis

- ESLint `react-hooks/set-state-in-effect`: hindari `setState` sinkron di `useEffect` load media; gunakan `key` pada bubble agar state reset saat ganti pesan.
