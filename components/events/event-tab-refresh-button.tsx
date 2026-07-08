"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EventTabRefreshButton({
  onClick,
  disabled,
  isRefreshing,
}: {
  onClick: () => void;
  disabled?: boolean;
  isRefreshing?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={disabled || isRefreshing}
      aria-label="Muat ulang data"
    >
      <RefreshCw className={cn("mr-1 h-4 w-4", isRefreshing && "animate-spin")} />
      Muat ulang
    </Button>
  );
}
