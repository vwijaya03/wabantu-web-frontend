import { CATALOG_IMAGE_MAX_BATCH_MB, CATALOG_IMAGE_MAX_MB } from "@/lib/catalog-image-limits";

type TranslateFn = (source: string, vars?: Record<string, string | number>) => string;

const DIRECT_MESSAGES = new Set([
  "Pilih file gambar terlebih dahulu.",
  "Format harus JPG, PNG, atau WEBP.",
  "File gambar terlalu kecil atau rusak.",
  "Pilih minimal satu file gambar.",
]);

/** Maps Indonesian messages from validateCatalogImageFiles to locale-aware text. */
export function translateCatalogImageValidationError(t: TranslateFn, err: string | null): string | null {
  if (!err) return null;
  if (DIRECT_MESSAGES.has(err)) return t(err);

  let m = err.match(/^Maksimal (\d+) gambar per proses\.$/);
  if (m) return t("Maksimal {maxFiles} gambar per proses.", { maxFiles: Number(m[1]) });

  m = err.match(
    /^Ukuran gambar maksimal (\d+) MB per file \(file Anda: (.+)\)\.$/,
  );
  if (m) {
    return t("Ukuran gambar maksimal {maxMb} MB per file (file Anda: {size}).", {
      maxMb: Number(m[1]) || CATALOG_IMAGE_MAX_MB,
      size: m[2],
    });
  }

  m = err.match(/^Total ukuran semua gambar maksimal (\d+) MB \(Anda: (.+)\)\.$/);
  if (m) {
    return t("Total ukuran semua gambar maksimal {maxBatchMb} MB (Anda: {size}).", {
      maxBatchMb: Number(m[1]) || CATALOG_IMAGE_MAX_BATCH_MB,
      size: m[2],
    });
  }

  m = err.match(/^(.+): (.+)$/);
  if (m) {
    const inner = translateCatalogImageValidationError(t, m[2]);
    return `${m[1]}: ${inner ?? t(m[2])}`;
  }

  return t(err);
}
