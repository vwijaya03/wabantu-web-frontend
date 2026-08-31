import type { CatalogItem, CatalogItemPrice } from "@/lib/api/catalog";
import type { PriceType } from "@/lib/api/price-types";

export type CatalogForm = {
  externalCode: string;
  name: string;
  description: string;
  sellPrice: string;
  priceByType: Record<string, string>;
  sellUnit: string;
  barcode: string;
  isActive: boolean;
};

export const emptyCatalogForm: CatalogForm = {
  externalCode: "",
  name: "",
  description: "",
  sellPrice: "",
  priceByType: {},
  sellUnit: "",
  barcode: "",
  isActive: true,
};

export function catalogFormFromItem(item: CatalogItem, priceTypes: PriceType[]): CatalogForm {
  const priceByType: Record<string, string> = {};
  for (const row of item.prices ?? []) {
    priceByType[row.priceTypeId] = String(row.price);
  }
  const defaultType = priceTypes.find((pt) => pt.isDefault) ?? priceTypes[0];
  if (defaultType && priceByType[defaultType.id] == null && item.sellPrice != null) {
    priceByType[defaultType.id] = String(item.sellPrice);
  }
  return {
    externalCode: item.externalCode,
    name: item.name,
    description: item.description ?? "",
    sellPrice: item.sellPrice == null ? "" : String(item.sellPrice),
    priceByType,
    sellUnit: item.sellUnit ?? "",
    barcode: item.barcode ?? "",
    isActive: item.isActive,
  };
}

export function duplicateCatalogForm(item: CatalogItem, priceTypes: PriceType[]): CatalogForm {
  const base = catalogFormFromItem(item, priceTypes);
  const name = `${item.name.trim()} (salinan)`;
  return {
    ...base,
    name,
    externalCode: "",
    isActive: true,
  };
}

function buildPricesPayload(form: CatalogForm, priceTypes: PriceType[]): CatalogItemPrice[] {
  return priceTypes
    .map((pt) => {
      const raw = form.priceByType[pt.id];
      if (raw == null || raw.trim() === "") return null;
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) return null;
      return { priceTypeId: pt.id, price };
    })
    .filter((row): row is CatalogItemPrice => row != null);
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function optionalNumber(value: string) {
  if (value.trim() === "") return undefined;
  return Number(value);
}

export function toCreatePayload(form: CatalogForm, priceTypes: PriceType[]) {
  const prices = buildPricesPayload(form, priceTypes);
  const defaultType = priceTypes.find((pt) => pt.isDefault);
  const defaultPrice =
    defaultType && form.priceByType[defaultType.id]
      ? optionalNumber(form.priceByType[defaultType.id])
      : optionalNumber(form.sellPrice);
  return {
    externalCode: form.externalCode.trim(),
    name: form.name.trim(),
    description: optionalString(form.description),
    sellPrice: defaultPrice,
    prices: prices.length > 0 ? prices : undefined,
    sellUnit: optionalString(form.sellUnit),
    barcode: optionalString(form.barcode),
    isActive: form.isActive,
  };
}

export function toUpdatePayload(form: CatalogForm, priceTypes: PriceType[]) {
  const prices = buildPricesPayload(form, priceTypes);
  const defaultType = priceTypes.find((pt) => pt.isDefault);
  const defaultPrice =
    defaultType && form.priceByType[defaultType.id]
      ? optionalNumber(form.priceByType[defaultType.id])
      : optionalNumber(form.sellPrice);
  return {
    name: form.name.trim(),
    description: optionalString(form.description),
    sellPrice: defaultPrice,
    prices: prices.length > 0 ? prices : undefined,
    sellUnit: optionalString(form.sellUnit),
    barcode: optionalString(form.barcode),
    isActive: form.isActive,
  };
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
