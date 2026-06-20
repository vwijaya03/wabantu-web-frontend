# Inbox Media, Bukti Transfer, & Stok AI — Spesifikasi Development

Spesifikasi lengkap (fase, migration, API, keputusan produk) ada di:

**[api-go/docs/WHATSAPP_INBOX_MEDIA_PAYMENT_STOCK.md](../../api-go/docs/WHATSAPP_INBOX_MEDIA_PAYMENT_STOCK.md)**

Ringkasan keputusan:

- Setting **manual** vs **auto_verify** bukti transfer (warning kuota token di UI)
- Setelah verified → order **`processing`**
- Rekening valid dari **FAQ / Knowledge Base** (nomor + atas nama wajib)
- Stok habis → **tolak qty**, tanpa alternatif produk (v1)

Urutan develop: Fase 1 (media inbox) → Fase 4 (stok) → Fase 2 (bukti) → Fase 3 (AI image lanjutan).
