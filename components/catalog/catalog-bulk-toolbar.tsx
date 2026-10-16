"use client";

import { useLocale } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";

type CatalogBulkToolbarProps = {
  selectedCount: number;
  deleting: boolean;
  onDelete: () => void;
};

export function CatalogBulkToolbar({ selectedCount, deleting, onDelete }: CatalogBulkToolbarProps) {
  const { t } = useLocale();
  if (selectedCount <= 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span>{t("{count} produk dipilih", { count: selectedCount })}</span>
      <Button variant="destructive" size="sm" disabled={deleting} onClick={onDelete}>
        {t("Hapus terpilih")}
      </Button>
    </div>
  );
}
