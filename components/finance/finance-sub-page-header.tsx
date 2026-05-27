import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type FinanceSubPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function FinanceSubPageHeader({
  title,
  description,
  actions,
}: FinanceSubPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="mt-0.5 h-9 w-9 shrink-0"
          aria-label="Kembali ke Finance"
        >
          <Link href="/dashboard/finance">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
