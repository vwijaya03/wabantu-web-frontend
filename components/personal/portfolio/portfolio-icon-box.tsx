import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PortfolioIconBoxVariant = "flow" | "flow-step" | "capability";

const variantClasses: Record<PortfolioIconBoxVariant, string> = {
  flow: "rounded-2xl border border-neutral-200/80 bg-neutral-100 text-neutral-900",
  "flow-step": "shrink-0 rounded-xl border border-neutral-200/80 bg-neutral-100 text-neutral-900",
  capability: "rounded-xl border border-neutral-200/80 bg-neutral-100 text-neutral-900",
};

const sizeClasses: Record<PortfolioIconBoxVariant, { box: string; icon: string }> = {
  flow: { box: "h-14 w-14", icon: "h-6 w-6" },
  "flow-step": { box: "h-10 w-10", icon: "h-5 w-5" },
  capability: { box: "h-10 w-10", icon: "h-5 w-5" },
};

export function PortfolioIconBox({
  Icon,
  variant,
  className,
}: {
  Icon: LucideIcon;
  variant: PortfolioIconBoxVariant;
  className?: string;
}) {
  const sizes = sizeClasses[variant];

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        variantClasses[variant],
        sizes.box,
        className,
      )}
    >
      <Icon className={sizes.icon} strokeWidth={1.5} />
    </div>
  );
}
