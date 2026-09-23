import type { TemplateManifestV1 } from "@/lib/template-engine/types";
import { themeFromManifest, themeToCssVars } from "@/lib/template-engine/apply-tokens";
import { sanitizeTokenValue } from "@/lib/template-engine/sanitize-token";

export function resolveManifestTheme(manifest?: TemplateManifestV1 | null) {
  const theme = themeFromManifest(manifest);
  const safe: Record<string, string> = {};
  const color = manifest?.tokens?.color ?? {};
  for (const [k, v] of Object.entries(color)) {
    const s = sanitizeTokenValue(k, v);
    if (s) safe[k] = s;
  }
  const sanitized: TemplateManifestV1 = manifest
    ? { ...manifest, tokens: { ...manifest.tokens, color: safe } }
    : { schemaVersion: 1, kind: "chatbot", meta: { name: "Default" }, tokens: { color: safe } };
  return { theme, style: themeToCssVars(themeFromManifest(sanitized)) };
}
