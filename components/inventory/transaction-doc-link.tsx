"use client";

import { cn } from "@/lib/utils";

/** Clickable document number (PO, bill, stock txn, dll). */
export function TransactionDocLink({
  docNo,
  onClick,
  className,
}: {
  docNo: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "font-mono font-medium text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {docNo}
    </button>
  );
}
