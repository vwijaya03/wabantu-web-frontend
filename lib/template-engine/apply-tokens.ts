import type { CSSProperties } from "react";
import type { TemplateManifestV1, TemplateTheme } from "@/lib/template-engine/types";

const DEFAULT_THEME: TemplateTheme = {
  primary: "#10b981",
  primaryForeground: "#ffffff",
  background: "#ffffff",
  foreground: "#0f172a",
};

export function themeFromManifest(manifest?: TemplateManifestV1 | null): TemplateTheme {
  const color = manifest?.tokens?.color ?? {};
  return {
    primary: color.primary ?? DEFAULT_THEME.primary,
    primaryForeground: color.primaryForeground ?? DEFAULT_THEME.primaryForeground,
    background: color.background ?? DEFAULT_THEME.background,
    foreground: color.foreground ?? DEFAULT_THEME.foreground,
    accent: color.accent,
  };
}

export function themeToCssVars(theme: TemplateTheme): CSSProperties {
  return {
    ["--cw-primary" as string]: theme.primary,
    ["--cw-primary-fg" as string]: theme.primaryForeground,
    ["--cw-bg" as string]: theme.background,
    ["--cw-fg" as string]: theme.foreground,
    ...(theme.accent ? { ["--cw-accent" as string]: theme.accent } : {}),
  };
}
