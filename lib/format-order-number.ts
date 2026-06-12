/** Nomor pesanan singkat untuk pembeli — sama dengan backend FormatOrderNumber (WB-XXXXXXXX). */
export function formatOrderNumber(orderId: string): string {
  const id = orderId.replace(/-/g, "").trim();
  if (!id) return "";
  return `WB-${id.slice(0, 8).toUpperCase()}`;
}
