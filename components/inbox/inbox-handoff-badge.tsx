import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getInboxHandoffDisplay } from "@/lib/inbox/handoff-display";

type InboxHandoffBadgeProps = {
  aiHandled: boolean;
  handoffReason: string | null;
  /** Ukuran teks keterangan; daftar percakapan lebih kecil dari header. */
  descriptionClassName?: string;
  className?: string;
};

export function InboxHandoffBadge({
  aiHandled,
  handoffReason,
  descriptionClassName,
  className,
}: InboxHandoffBadgeProps) {
  const display = getInboxHandoffDisplay({ aiHandled, handoffReason });

  return (
    <div className={cn("space-y-1", className)}>
      <Badge variant={display.badgeVariant} className="w-fit text-[10px]">
        {display.badgeLabel}
      </Badge>
      {display.description ? (
        <p
          className={cn(
            "text-muted-foreground line-clamp-2",
            descriptionClassName ?? "text-[11px]",
          )}
        >
          {display.description}
        </p>
      ) : null}
    </div>
  );
}
