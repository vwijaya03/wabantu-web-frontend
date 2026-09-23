const SAFE_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const SAFE_LEN = 120;

export function sanitizeTokenValue(key: string, value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().slice(0, SAFE_LEN);
  if (key.toLowerCase().includes("color") || key.endsWith("Foreground")) {
    return SAFE_COLOR.test(v) ? v : undefined;
  }
  if (v.includes("<") || v.includes("url(")) return undefined;
  return v;
}
