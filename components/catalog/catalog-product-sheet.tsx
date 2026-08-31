"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CatalogProductForm } from "@/components/catalog/catalog-product-form";
import type { CatalogForm } from "@/lib/catalog/form";
import type { PriceType } from "@/lib/api/price-types";

type CatalogProductSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  form: CatalogForm;
  setForm: (form: CatalogForm) => void;
  priceTypes: PriceType[];
  canManage: boolean;
  saving: boolean;
  onSave: () => void;
};

export function CatalogProductSheet({
  open,
  onOpenChange,
  mode,
  form,
  setForm,
  priceTypes,
  canManage,
  saving,
  onSave,
}: CatalogProductSheetProps) {
  const isEdit = mode === "edit";
  const canSave =
    canManage &&
    form.name.trim() &&
    (isEdit || form.externalCode.trim()) &&
    !saving;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit produk" : "Tambah produk"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Ubah nama, harga, barcode, deskripsi, dan status produk."
              : "Isi detail produk untuk katalog AI dan pesanan."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <CatalogProductForm form={form} setForm={setForm} isEdit={isEdit} priceTypes={priceTypes} />
          {!canManage && (
            <p className="mt-3 text-xs text-muted-foreground">
              Hanya owner atau super admin yang sedang Pantau tenant yang dapat mengubah katalog.
            </p>
          )}
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onSave} disabled={!canSave}>
            {saving ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Simpan"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
