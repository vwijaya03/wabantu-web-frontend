/** Must match api-go/events/image_import.go */
export const EVENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const EVENT_IMAGE_MAX_MB = 5;
export const EVENT_IMAGE_MAX_BATCH_BYTES = 20 * 1024 * 1024;
export const EVENT_IMAGE_MAX_BATCH_MB = 20;
export const EVENT_IMAGE_MAX_FILES = 5;
export const EVENT_IMAGE_MIN_BYTES = 1024;

export const EVENT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp"];

export function formatEventImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extFromFile(file: File): string {
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (ALLOWED_EXT.includes(ext)) return ext;
  const t = (file.type || "").toLowerCase();
  if (t === "image/jpeg" || t === "image/jpg") return ".jpg";
  if (t === "image/png") return ".png";
  if (t === "image/webp") return ".webp";
  return ext;
}

export function validateEventImageFile(file: File | null): string | null {
  if (!file) return "Pilih file gambar terlebih dahulu.";
  const ext = extFromFile(file);
  if (!ALLOWED_EXT.includes(ext)) return "Format harus JPG, PNG, atau WEBP.";
  if (file.size > EVENT_IMAGE_MAX_BYTES) {
    return `Ukuran maksimal ${EVENT_IMAGE_MAX_MB} MB per file (${formatEventImageSize(file.size)}).`;
  }
  if (file.size < EVENT_IMAGE_MIN_BYTES) return "File gambar terlalu kecil atau rusak.";
  return null;
}

export function validateEventImageFiles(files: File[]): string | null {
  if (files.length === 0) return "Pilih minimal satu file gambar.";
  if (files.length > EVENT_IMAGE_MAX_FILES) {
    return `Maksimal ${EVENT_IMAGE_MAX_FILES} gambar per proses.`;
  }
  let total = 0;
  for (const f of files) {
    const err = validateEventImageFile(f);
    if (err) return `${f.name}: ${err}`;
    total += f.size;
  }
  if (total > EVENT_IMAGE_MAX_BATCH_BYTES) {
    return `Total ukuran maksimal ${EVENT_IMAGE_MAX_BATCH_MB} MB (${formatEventImageSize(total)}).`;
  }
  return null;
}
