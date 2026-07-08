"use client";

import { Label } from "@/components/ui/label";
import { ListSortControl } from "@/components/events/list-sort-control";
import type { ListSortState, SortOption } from "@/lib/events-sort";

export function ExportSortPanel({
  options,
  tableSort,
  exportSort,
  syncWithTable,
  onExportSortChange,
  onSyncWithTableChange,
  className,
}: {
  options: SortOption[];
  tableSort: ListSortState;
  exportSort: ListSortState;
  syncWithTable: boolean;
  onExportSortChange: (next: ListSortState) => void;
  onSyncWithTableChange: (sync: boolean) => void;
  className?: string;
}) {
  const active = syncWithTable ? tableSort : exportSort;

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Urutan baris export</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <ListSortControl
          options={options}
          sortBy={active.sortBy}
          sortDir={active.sortDir}
          onChange={(next) => {
            if (syncWithTable) {
              onSyncWithTableChange(false);
              onExportSortChange(next);
            } else {
              onExportSortChange(next);
            }
          }}
        />
        <div className="flex items-center gap-2 pb-1">
          <input
            id="export-sync-table-sort"
            type="checkbox"
            className="h-4 w-4 rounded border"
            checked={syncWithTable}
            onChange={(e) => onSyncWithTableChange(e.target.checked)}
          />
          <Label htmlFor="export-sync-table-sort" className="text-xs font-normal">
            Samakan dengan urutan tabel
          </Label>
        </div>
      </div>
      {!syncWithTable ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Export mengurutkan semua baris hasil filter (maks. 2.500), bukan hanya halaman tabel.
        </p>
      ) : null}
    </div>
  );
}

export function resolveExportSort(
  tableSort: ListSortState,
  exportSort: ListSortState,
  syncWithTable: boolean,
): ListSortState {
  return syncWithTable ? tableSort : exportSort;
}
