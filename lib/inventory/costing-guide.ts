export type CostingMethod = "fifo" | "lifo" | "average";

export const COSTING_METHOD_GUIDES: Record<
  CostingMethod,
  { title: string; short: string; example: string; bestFor: string }
> = {
  fifo: {
    title: "FIFO (First In, First Out)",
    short: "Barang yang masuk lebih dulu, keluar lebih dulu.",
    example:
      "Contoh: salmon frozen batch Januari harus habis sebelum batch Februari — HPP mengikuti batch yang paling lama di gudang.",
    bestFor: "Makanan mudah basi, produk ada expiry, butuh telusur batch/lot.",
  },
  lifo: {
    title: "LIFO (Last In, First Out)",
    short: "Barang yang masuk terakhir, keluar lebih dulu.",
    example:
      "Contoh: harga beli naik terus dan stok lama sengaja ditahan — biaya penjualan mengikuti pembelian terbaru.",
    bestFor: "Kasus khusus; jarang dipakai UMKM. Konsultasikan akuntan jika ragu.",
  },
  average: {
    title: "Average (Rata-rata tertimbang)",
    short: "HPP dihitung dari rata-rata tertimbang semua stok masuk.",
    example:
      "Contoh: beli 10 pcs @ Rp10.000 lalu 10 pcs @ Rp12.000 → HPP rata-rata Rp11.000 per pcs.",
    bestFor: "Banyak SKU seragam, harga beli fluktuatif, ingin cara paling sederhana.",
  },
};
