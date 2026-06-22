# Frontend Chatbot QA Checklist

Checklist ini untuk memastikan UI `dashboard/inbox` konsisten dengan pipeline AI backend.

## Inbox behavior

- Pesan inbound baru muncul real-time (SSE) tanpa refresh manual.
- Balasan AI/system dari pipeline tampil di thread conversation.
- Ordering pesan tetap kronologis saat burst message.

## Conversation controls

- Tombol handoff mematikan AI (`aiHandled=false`) dan terlihat efeknya.
- Tombol resume AI mengaktifkan lagi flow balasan otomatis.
- Badge/unread counter sinkron setelah baca thread.

## Policy visibility

- Saat pertanyaan di luar scope, user menerima balasan aman (bukan silence).
- Saat profil bisnis belum lengkap, user mendapat pesan CS follow-up.
- Saat order flow bertahap, user melihat prompt langkah berikutnya.
- Setelah alamat/order selesai, pertanyaan ongkir/total (`ongkir kena berapa`, `total termasuk ongkir`) mendapat balasan AI (path `llm`), bukan template out-of-scope.
- Konfirmasi pembayaran (`nanti saya transfer`, `trf`) setelah checkout tidak boleh dijawab “di luar topik bisnis”.
- Minta **list produk** / katalog: balasan dari `business_catalog_item` (path `catalog_db`), bukan mengarah ke IG/website dulu jika katalog DB terisi.
- Katalog DB kosong: ada penanda `[Katalog WABantu: kosong]`; URL eksternal hanya pelengkap.

## Catalog import (dashboard, bukan inbox)

- `/dashboard/catalog/import-image`: file > 5 MB, > 5 file, atau total > 20 MB ditolak di UI sebelum upload API.
- `/dashboard/finance/transactions/import-image`: batas upload sama (reuse `catalog-image-limits.ts`); owner only; pratinjau wajib sebelum commit.
- Import transaksi/katalog gambar gagal “kunci Anthropic”: cek `encore secret list` → `AnthropicAPIKey`; restart `encore run` setelah set secret.
- Banner peringatan: fitur AI mengurangi kuota `ai_token`.
- Alur: upload → proses AI → edit tabel → simpan (commit tanpa AI tambahan).

## Regression checks

- Human-send message tetap bekerja normal.
- SSE reconnect tetap berfungsi setelah tab idle.
- Tidak ada UI crash jika message metadata memiliki `reason`.

## Order flow continuity (Abon Sapi)

Manual QA di inbox setelah deploy api-go terbaru:

1. `jual abon sapi ?` → balasan `catalog_db` (harga + stok Abon), bukan LLM generik.
2. `mau beli 2 lusin bisa ? stoknya ready ?` → `order_flow` / `order_intent` (24 pcs, cek stok), bukan retail policy per pcs saja.
3. `stoknya ada ?` (follow-up) → jawab stok produk dari konteks chat, bukan daftar katalog acak.
