"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ListSortState, SortDir, SortOption } from "@/lib/events-sort";

/** Filter bar / export: pilih kolom + panah naik/turun (pola spreadsheet). */
export function ListSortControl({
  options,
  sortBy,
  sortDir,
  onChange,
  className,
  label = "Urutkan",
  hideLabel,
}: {
  options: SortOption[];
  sortBy: string;
  sortDir: SortDir;
  onChange: (next: ListSortState) => void;
  className?: string;
  label?: string;
  hideLabel?: boolean;
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] space-y-1">
          {!hideLabel ? <Label className="text-xs text-muted-foreground">{label}</Label> : null}
          <Select value={sortBy} onValueChange={(v) => onChange({ sortBy: v, sortDir })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          className="flex h-9 flex-col overflow-hidden rounded-md border bg-background"
          role="group"
          aria-label="Arah urutan"
        >
          <button
            type="button"
            className={cn(
              "flex flex-1 items-center justify-center px-2 hover:bg-muted",
              sortDir === "asc" && "bg-muted text-foreground",
            )}
            title="Urut naik"
            onClick={() => onChange({ sortBy, sortDir: "asc" })}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "flex flex-1 items-center justify-center border-t px-2 hover:bg-muted",
              sortDir === "desc" && "bg-muted text-foreground",
            )}
            title="Urut turun"
            onClick={() => onChange({ sortBy, sortDir: "desc" })}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
