"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getInboxHandoffDisplay } from "@/lib/inbox/handoff-display";
import { useLocale } from "@/lib/i18n/locale";

type InboxHandoffBadgeProps = {
  aiHandled: boolean;
  handoffReason: string | null;
  /** Tampilkan baris keterangan di bawah badge (mis. header chat). */
  showDescription?: boolean;
  /** Ukuran/teks keterangan; daftar percakapan lebih kecil dari header. */
  descriptionClassName?: string;
  /** Hanya badge, tanpa spacing ekstra untuk baris keterangan. */
  compact?: boolean;
  className?: string;
};

export function InboxHandoffBadge({
  aiHandled,
  handoffReason,
  showDescription = false,
  descriptionClassName,
  compact = false,
  className,
}: InboxHandoffBadgeProps) {
  const { t } = useLocale();
  const display = getInboxHandoffDisplay({ aiHandled, handoffReason });
  const badgeLabel = t(display.badgeLabel);
  const description =
    display.description != null ? t(display.description) : null;
  const ariaLabel =
    description != null ? `${badgeLabel}. ${description}` : undefined;

  return (
    <div
      className={cn(!compact && showDescription && "space-y-1", className)}
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
      title={!showDescription && description ? description : undefined}
    >
      <Badge variant={display.badgeVariant} className="w-fit text-[10px]">
        {badgeLabel}
      </Badge>
      {showDescription && description ? (
        <p
          className={cn(
            "text-muted-foreground",
            descriptionClassName ?? "text-xs",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
