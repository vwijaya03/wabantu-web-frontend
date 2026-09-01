"use client";

import { Copy, MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DescriptionPlainPreview } from "@/components/catalog/description-rich-editor";
import type { CatalogItem } from "@/lib/api/catalog";
import { formatRupiah } from "@/lib/catalog/form";

type CatalogProductTableProps = {
  items: CatalogItem[];
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  canManage: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onEdit: (item: CatalogItem) => void;
  onDuplicate: (item: CatalogItem) => void;
  onToggleActive: (item: CatalogItem) => void;
  onDelete: (item: CatalogItem) => void;
};

export function CatalogProductTable({
  items,
  selectedIds,
  allVisibleSelected,
  canManage,
  onToggleSelectAll,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: CatalogProductTableProps) {
  return (
    <TooltipProvider>
      <div className="hidden lg:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleSelectAll}
                  disabled={!canManage}
                  aria-label="Pilih semua produk di halaman ini"
                />
              </TableHead>
              <TableHead className="w-[32%]">Produk</TableHead>
              <TableHead className="w-[18%]">SKU</TableHead>
              <TableHead className="w-[14%]">Barcode</TableHead>
              <TableHead className="w-[14%]">Harga</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-12 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleSelect(item.id)}
                    disabled={!canManage}
                    aria-label={`Pilih produk ${item.name}`}
                  />
                </TableCell>
                <TableCell className="min-w-0">
                  <TruncatedText text={item.name} className="font-medium" />
                  {item.description ? (
                    <DescriptionPlainPreview value={item.description} className="mt-1 line-clamp-2" />
                  ) : null}
                </TableCell>
                <TableCell className="min-w-0">
                  <TruncatedText text={item.externalCode} className="font-mono text-xs" />
                </TableCell>
                <TableCell className="min-w-0">
                  {item.barcode ? (
                    <TruncatedText text={item.barcode} className="text-xs text-muted-foreground" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {item.sellPrice != null ? formatRupiah(item.sellPrice) : "—"}
                  {item.sellUnit ? <span className="text-muted-foreground"> / {item.sellUnit}</span> : null}
                </TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? "success" : "destructive"}>
                    {item.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <ProductRowActions
                    item={item}
                    canManage={canManage}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onToggleActive={onToggleActive}
                    onDelete={onDelete}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y rounded-lg border lg:hidden">
        {items.map((item) => (
          <div key={item.id} className="space-y-2 p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedIds.has(item.id)}
                onChange={() => onToggleSelect(item.id)}
                disabled={!canManage}
                aria-label={`Pilih produk ${item.name}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.name}</p>
                  <Badge variant={item.isActive ? "success" : "destructive"} className="shrink-0">
                    {item.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{item.externalCode}</p>
                {item.barcode ? <p className="text-xs text-muted-foreground">Barcode: {item.barcode}</p> : null}
                <p className="mt-1 text-sm">
                  {item.sellPrice != null ? formatRupiah(item.sellPrice) : "—"}
                  {item.sellUnit ? <span className="text-muted-foreground"> / {item.sellUnit}</span> : null}
                </p>
              </div>
              <ProductRowActions
                item={item}
                canManage={canManage}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
              />
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

function TruncatedText({ text, className }: { text: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p className={`truncate ${className ?? ""}`} tabIndex={0}>
          {text}
        </p>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-sm break-all">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function ProductRowActions({
  item,
  canManage,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: {
  item: CatalogItem;
  canManage: boolean;
  onEdit: (item: CatalogItem) => void;
  onDuplicate: (item: CatalogItem) => void;
  onToggleActive: (item: CatalogItem) => void;
  onDelete: (item: CatalogItem) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canManage} aria-label="Aksi produk">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(item)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(item)}>
          <Copy className="mr-2 h-4 w-4" />
          Duplikat
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleActive(item)}>
          {item.isActive ? (
            <>
              <PowerOff className="mr-2 h-4 w-4" />
              Nonaktifkan
            </>
          ) : (
            <>
              <Power className="mr-2 h-4 w-4" />
              Aktifkan
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(item)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
