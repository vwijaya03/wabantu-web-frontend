"use client";

import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="group"
      aria-label={t("Bahasa")}
      className={cn(
        "inline-flex items-center rounded-md border bg-background p-0.5 text-xs font-semibold",
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={locale === "id"}
        onClick={() => setLocale("id")}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          locale === "id"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        ID
      </button>
      <button
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          locale === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        EN
      </button>
    </div>
  );
}
