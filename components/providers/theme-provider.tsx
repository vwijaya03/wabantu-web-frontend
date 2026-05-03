"use client";

import type { ReactNode } from "react";

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  // Keep this as a no-op wrapper for now to avoid client render errors
  // caused by script injection from third-party theme providers.
  return <>{children}</>;
}
