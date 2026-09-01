"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DescriptionRichEditor } from "@/components/catalog/description-rich-editor";
import type { CatalogImageDraftItem } from "@/lib/api/catalogImage";

type CatalogImportDraftTableProps = {
  items: CatalogImageDraftItem[];
  onUpdateItem: (idx: number, patch: Partial<CatalogImageDraftItem>) => void;
};

export function CatalogImportDraftTable({ items, onUpdateItem }: CatalogImportDraftTableProps) {
  return (
    <div className="space-y-4">
      {items.map((row, idx) => (
        <div key={`${row.externalCode}-${idx}`} className="grid gap-2 rounded border p-3 md:grid-cols-12 md:items-end">
          <div className="flex items-center gap-2 md:col-span-1">
            <input
              type="checkbox"
              checked={row.include}
              onChange={(e) => onUpdateItem(idx, { include: e.target.checked })}
              aria-label="Sertakan"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">SKU / Kode</Label>
            <Input
              value={row.externalCode}
              onChange={(e) => onUpdateItem(idx, { externalCode: e.target.value })}
            />
          </div>
          <div className="md:col-span-4">
            <Label className="text-xs">Nama</Label>
            <Input value={row.name} onChange={(e) => onUpdateItem(idx, { name: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Harga (IDR)</Label>
            <Input
              type="number"
              value={row.sellPrice ?? ""}
              onChange={(e) =>
                onUpdateItem(idx, {
                  sellPrice: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Satuan</Label>
            <Input
              value={row.sellUnit ?? "pcs"}
              onChange={(e) => onUpdateItem(idx, { sellUnit: e.target.value })}
            />
          </div>
          <div className="md:col-span-12 md:col-start-2">
            <DescriptionRichEditor
              label="Deskripsi"
              value={row.description ?? ""}
              onChange={(description) => onUpdateItem(idx, { description })}
              rows={5}
              hint="Edit format bullet/fitur produk sebelum disimpan."
            />
          </div>
        </div>
      ))}
    </div>
  );
}
