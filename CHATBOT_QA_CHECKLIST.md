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

## Regression checks

- Human-send message tetap bekerja normal.
- SSE reconnect tetap berfungsi setelah tab idle.
- Tidak ada UI crash jika message metadata memiliki `reason`.
