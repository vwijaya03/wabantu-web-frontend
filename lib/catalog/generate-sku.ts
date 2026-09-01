const MAX_BASE_LEN = 40;

/** Buat SKU dari nama produk: uppercase, underscore, suffix unik 4 char. */
export function generateSkuFromProductName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase()
    .slice(0, MAX_BASE_LEN);

  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  if (!base) return `PRD_${suffix}`;
  return `${base}_${suffix}`;
}
