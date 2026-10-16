"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale";

export function EventTabRefreshButton({
  onClick,
  disabled,
  isRefreshing,
}: {
  onClick: () => void;
  disabled?: boolean;
  isRefreshing?: boolean;
}) {
  const { t } = useLocale();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={disabled || isRefreshing}
      aria-label={t("Muat ulang data")}
    >
      <RefreshCw className={cn("mr-1 h-4 w-4", isRefreshing && "animate-spin")} />
      {t("Muat ulang")}
    </Button>
  );
}
