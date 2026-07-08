"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ListSortState, SortDir } from "@/lib/events-sort";

export function SortableTableHead({
  label,
  sortKey,
  sort,
  onSortChange,
  className,
  defaultDir = "asc",
}: {
  label: string;
  sortKey: string;
  sort: ListSortState;
  onSortChange: (next: ListSortState) => void;
  className?: string;
  defaultDir?: SortDir;
}) {
  const active = sort.sortBy === sortKey;

  const handleClick = () => {
    if (active) {
      onSortChange({ sortBy: sortKey, sortDir: sort.sortDir === "asc" ? "desc" : "asc" });
      return;
    }
    onSortChange({ sortBy: sortKey, sortDir: defaultDir });
  };

  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-left font-medium hover:text-foreground"
        onClick={handleClick}
      >
        <span>{label}</span>
        <span className="inline-flex flex-col text-muted-foreground" aria-hidden>
          <ChevronUp
            className={cn(
              "-mb-1 h-3.5 w-3.5",
              active && sort.sortDir === "asc" && "text-foreground",
            )}
          />
          <ChevronDown
            className={cn("h-3.5 w-3.5", active && sort.sortDir === "desc" && "text-foreground")}
          />
        </span>
      </button>
    </TableHead>
  );
}
