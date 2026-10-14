import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getInboxHandoffDisplay } from "@/lib/inbox/handoff-display";

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
  const display = getInboxHandoffDisplay({ aiHandled, handoffReason });
  const ariaLabel =
    display.description != null
      ? `${display.badgeLabel}. ${display.description}`
      : undefined;

  return (
    <div
      className={cn(!compact && showDescription && "space-y-1", className)}
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
      title={
        !showDescription && display.description ? display.description : undefined
      }
    >
      <Badge variant={display.badgeVariant} className="w-fit text-[10px]">
        {display.badgeLabel}
      </Badge>
      {showDescription && display.description ? (
        <p
          className={cn(
            "text-muted-foreground",
            descriptionClassName ?? "text-xs",
          )}
        >
          {display.description}
        </p>
      ) : null}
    </div>
  );
}
