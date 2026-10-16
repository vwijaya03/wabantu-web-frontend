import type { Locale } from "@/lib/i18n/locale-types";
import { enCatalog } from "@/lib/i18n/catalogs";

export function translate(
  locale: Locale,
  source: string,
  vars?: Record<string, string | number>,
): string {
  const text = locale === "en" ? (enCatalog[source] ?? source) : source;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value == null ? `{${key}}` : String(value);
  });
}
