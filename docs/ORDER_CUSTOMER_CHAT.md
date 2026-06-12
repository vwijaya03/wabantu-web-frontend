# Pesanan via Chat — Nomor, Status & Pembatalan

Ringkasan fitur untuk **CS, owner, dan tim operasional** saat pembeli berinteraksi lewat WhatsApp.

> Detail teknis backend: [api-go/docs/ORDER_CUSTOMER_CHAT.md](../../api-go/docs/ORDER_CUSTOMER_CHAT.md)

---

## Nomor pesanan untuk pembeli

Setiap pesanan yang tercatat dari chat punya **nomor referensi singkat**:

**Format:** `WB-` + 8 karakter (contoh: `WB-EB76635C`)

- Dikirim otomatis ke pembeli saat order selesai dicatat AI
- Ditampilkan di **Dashboard → Pesanan** (bukan potongan UUID mentah)
- Pembeli bisa menyebut nomor ini saat follow-up ke CS

Utility frontend: `lib/format-order-number.ts` → `formatOrderNumber(orderId)`

---

## Apa yang bisa pembeli lakukan lewat chat?

| Permintaan pembeli | Respons AI |
|--------------------|------------|
| "Pesanan saya ada?" / "Status pesanan?" | Ringkasan order terbaru dari chat ini (produk, total, status) |
| "Batalkan pesanan" / "Mau saya batalkan ya" | Batalkan jika masih bisa (`draft`–`paid`); konfirmasi + nomor pesanan |
| Order sedang diisi (belum simpan) + minta batal | Checkout dibatalkan, tanpa baris order di DB |

Pembatalan **tidak** otomatis untuk pesanan yang sudah **dikirim** atau **selesai** — arahkan ke CS.

---

## Log di inbox

Pesan balasan sistem memuat metadata untuk audit:

- `path`: `order_cancel` atau `order_status`
- `orderId`: UUID internal pesanan
- `orderAction`: `cancel`, `cancel_draft`, atau `status`
- `llmUsed`: `false` (jawaban deterministik, bukan LLM)

Berguna saat investigasi: "Kenapa pesanan X dibatalkan?" atau "Siapa yang minta cek status?"

---

## Dashboard Pesanan

Halaman `/dashboard/orders` menampilkan nomor `WB-...` di daftar dan dialog konfirmasi hapus.

Status operasional tetap dikelola owner/staff di dashboard (draft → processing → shipped → completed).

---

## Changelog

| Tanggal | Perubahan |
|---------|-----------|
| 2026-06-08 | Tampilan nomor WB-* di dashboard; dokumentasi alur chat |
