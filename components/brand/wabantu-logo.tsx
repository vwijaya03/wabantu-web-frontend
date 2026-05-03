import { cn } from "@/lib/utils";

type WabantuLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  compact?: boolean;
};

export function WabantuLogo({
  className,
  iconClassName,
  textClassName,
  compact = false,
}: WabantuLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 48 48"
        aria-hidden
        className={cn("h-8 w-8 shrink-0", iconClassName)}
      >
        <defs>
          <linearGradient id="wabantu-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="12"
          fill="url(#wabantu-logo-gradient)"
        />
        <path
          d="M14 14h20a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4h-8l-7 6v-6h-5a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z"
          fill="#ffffff"
          fillOpacity="0.94"
        />
        <path d="m24 19 6 0-4 6h5l-7 9 2-7h-5Z" fill="#15803d" />
      </svg>
      {!compact && (
        <span className={cn("text-base font-semibold tracking-tight", textClassName)}>
          WABantu
        </span>
      )}
    </span>
  );
}
