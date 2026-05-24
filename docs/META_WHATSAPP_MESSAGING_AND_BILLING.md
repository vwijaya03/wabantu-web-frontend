# WhatsApp (Meta) vs kuota WABantu — panduan client

Dokumen untuk **owner** dan tim CS. Detail teknis & angka Meta: [api-go/docs/META_WHATSAPP_MESSAGING_AND_BILLING.md](../../api-go/docs/META_WHATSAPP_MESSAGING_AND_BILLING.md).

## Di dashboard, lihat kuota di mana?

- **Billing** → kartu **Kuota paket bulan ini** (progress bar + sisa).
- **Import gambar / AI** → banner sisa token AI.

Itu kuota **WABantu**, bukan tagihan Meta.

## Dua biaya terpisah

| Pembayaran | Untuk |
|------------|--------|
| Invoice WABantu (QRIS) | Software + AI + fitur |
| Meta (kartu di Business Manager Anda) | Template WhatsApp marketing/utility yang **terkirim** |

## Kapan chat inbox gratis di Meta?

**Gratis** kalau pelanggan **chat dulu** dan Anda balas **teks biasa** dalam **24 jam** (termasuk handoff, staff manual, AI).

**Tidak gratis / sering tidak terkirim** kalau Anda yang menyapa dulu setelah pelanggan lama diam — butuh template Meta (berbayar).

## Ringkas skenario

| Situasi | Meta | Kuota WABantu |
|---------|------|----------------|
| Customer chat → Anda balas (24 jam) | Gratis | AI pakai token jika pakai AI |
| Anda follow-up setelah seminggu diam (inbox teks) | Gagal / tidak sampai | — |
| Promosi template ke banyak nomor | ~Rp 447/pesan (ID, marketing) | `broadcast_contact` = batas platform |

## Referensi

- Kuota angka paket: [LIMITS_AND_QUOTAS.md](../LIMITS_AND_QUOTAS.md)
- Onboarding bagian 9: [ONBOARDING_AND_PRODUCT_GUIDE.md](../ONBOARDING_AND_PRODUCT_GUIDE.md#9-paket--batasan-fitur)
