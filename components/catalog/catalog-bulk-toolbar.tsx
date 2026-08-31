"use client";

import { Button } from "@/components/ui/button";

type CatalogBulkToolbarProps = {
  selectedCount: number;
  deleting: boolean;
  onDelete: () => void;
};

export function CatalogBulkToolbar({ selectedCount, deleting, onDelete }: CatalogBulkToolbarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span>{selectedCount} produk dipilih</span>
      <Button variant="destructive" size="sm" disabled={deleting} onClick={onDelete}>
        Hapus terpilih
      </Button>
    </div>
  );
}
