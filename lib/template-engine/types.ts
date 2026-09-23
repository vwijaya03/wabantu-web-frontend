export type TemplateManifestV1 = {
  schemaVersion: number;
  kind: "chatbot" | "storefront" | "bundle";
  meta: { name: string; author?: string; tags?: string[] };
  tokens: {
    color?: Record<string, string>;
    motion?: Record<string, boolean>;
  };
};

export type TemplateTheme = {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  accent?: string;
};
