"use client";

import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DescriptionRichEditor } from "@/components/catalog/description-rich-editor";
import { cn } from "@/lib/utils";
import { generateSkuFromProductName } from "@/lib/catalog/generate-sku";
import type { CatalogForm } from "@/lib/catalog/form";
import type { PriceType } from "@/lib/api/price-types";
import { toast } from "sonner";

export function CatalogProductForm({
  form,
  setForm,
  isEdit,
  priceTypes,
}: {
  form: CatalogForm;
  setForm: (form: CatalogForm) => void;
  isEdit?: boolean;
  priceTypes: PriceType[];
}) {
  const update = (patch: Partial<CatalogForm>) => setForm({ ...form, ...patch });
  const updatePrice = (priceTypeId: string, value: string) => {
    const next = { ...form.priceByType, [priceTypeId]: value };
    const defaultType = priceTypes.find((pt) => pt.isDefault);
    const patch: Partial<CatalogForm> = { priceByType: next };
    if (defaultType && priceTypeId === defaultType.id) {
      patch.sellPrice = value;
    }
    setForm({ ...form, ...patch });
  };

  const generateSku = () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Isi nama produk dulu");
      return;
    }
    update({ externalCode: generateSkuFromProductName(name) });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="catalog-name">Nama</Label>
        <Input
          id="catalog-name"
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Nama produk"
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Label htmlFor="catalog-sku">SKU / Kode</Label>
          {!isEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-primary"
              onClick={generateSku}
              disabled={!form.name.trim()}
            >
              <Wand2 className="h-3.5 w-3.5" />
              Generate
            </Button>
          )}
        </div>
        <Input
          id="catalog-sku"
          value={form.externalCode}
          onChange={(e) => update({ externalCode: e.target.value.toUpperCase() })}
          disabled={isEdit}
          placeholder="KAOS_POLOS_L"
          className="font-mono text-sm uppercase"
        />
        {!isEdit && (
          <p className="mt-1 text-xs text-muted-foreground">Dari nama, atau ketik manual. Unik per tenant.</p>
        )}
      </div>
      {priceTypes.length > 0 ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Harga per tipe</p>
          {priceTypes.map((pt) => (
            <div key={pt.id}>
              <Label>
                {pt.label}
                {pt.isDefault ? " (default)" : ""}
              </Label>
              <Input
                value={form.priceByType[pt.id] ?? ""}
                onChange={(e) => updatePrice(pt.id, e.target.value)}
                type="number"
                min="0"
                placeholder="25000"
              />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <Label>Harga (IDR)</Label>
          <Input
            value={form.sellPrice}
            onChange={(e) => update({ sellPrice: e.target.value })}
            type="number"
            min="0"
            placeholder="25000"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Satuan</Label>
          <Input value={form.sellUnit} onChange={(e) => update({ sellUnit: e.target.value })} placeholder="pcs" />
        </div>
        <div>
          <Label>Barcode</Label>
          <Input value={form.barcode} onChange={(e) => update({ barcode: e.target.value })} placeholder="Opsional" />
        </div>
      </div>
      <DescriptionRichEditor
        id="catalog-desc"
        value={form.description}
        onChange={(description) => update({ description })}
        rows={5}
      />
      <ProductActiveToggle active={form.isActive} onChange={(isActive) => update({ isActive })} />
    </div>
  );
}

function ProductActiveToggle({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: (active: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Status produk</Label>
      <div
        className="flex rounded-lg border bg-muted/20 p-1"
        role="group"
        aria-label="Status produk aktif atau nonaktif"
      >
        <button
          type="button"
          disabled={disabled}
          aria-pressed={active}
          onClick={() => onChange(true)}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            active
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/80",
          )}
        >
          Aktif
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={!active}
          onClick={() => onChange(false)}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            !active
              ? "bg-destructive text-destructive-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/80",
          )}
        >
          Nonaktif
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {active ? "Produk tampil di AI & pesanan." : "Produk disembunyikan dari AI & pesanan."}
      </p>
    </div>
  );
}
