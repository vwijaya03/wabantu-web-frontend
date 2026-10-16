"use client";

import { env } from "@/lib/env";
import { useLocale } from "@/lib/i18n/locale";

export function AuthMarketing() {
  const { t } = useLocale();

  return (
    <div className="relative flex h-full flex-col items-center justify-center px-12 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {env.appTagline}
        </p>
        <h2 className="text-3xl font-bold tracking-tight">
          {t("Pelanggan dibalas dalam hitungan detik, bukan jam.")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "Setup 5 menit, AI tahu konteks bisnis Anda, dan owner bisa ambil alih kapan saja.",
          )}
        </p>
      </div>
    </div>
  );
}
