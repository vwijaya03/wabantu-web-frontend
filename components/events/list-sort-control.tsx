"use client";

import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ListSortState, SortDir, SortOption } from "@/lib/events-sort";

export function ListSortControl({
  options,
  sortBy,
  sortDir,
  onChange,
  className,
}: {
  options: SortOption[];
  sortBy: string;
  sortDir: SortDir;
  onChange: (next: ListSortState) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] space-y-1">
          <Label className="text-xs text-muted-foreground">Urutkan</Label>
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => onChange({ sortBy, sortDir: sortDir === "asc" ? "desc" : "asc" })}
          title={sortDir === "asc" ? "Urutan naik (A→Z)" : "Urutan turun (Z→A)"}
        >
          {sortDir === "asc" ? (
            <ArrowDownAZ className="mr-1 h-4 w-4" />
          ) : (
            <ArrowUpAZ className="mr-1 h-4 w-4" />
          )}
          {sortDir === "asc" ? "A→Z" : "Z→A"}
        </Button>
      </div>
    </div>
  );
}
