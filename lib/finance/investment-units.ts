/**
 * Satuan kepemilikan & harga per instrumen investasi (praktik pasar Indonesia + umum).
 *
 * - Saham IDX: qty dalam lot, harga per lembar (1 lot = 100 lembar).
 * - Emas retail: qty dalam gram, harga per gram (Antam/Pegadaian).
 * - Reksa dana: qty dalam unit, harga per unit (NAV).
 * - Kripto: qty dalam koin/aset dasar, harga per koin.
 */

export type InvestmentAssetType = "stock" | "crypto" | "gold" | "mutual_fund" | "other";

export type AssetUnitPreset = {
  /** Nilai disimpan di fin_asset.unit_name */
  value: string;
  label: string;
  multiplier: number;
  priceUnit: string;
  hint?: string;
};

export const INVESTMENT_ASSET_UNIT_PRESETS: Record<InvestmentAssetType, AssetUnitPreset[]> = {
  stock: [
    {
      value: "lot",
      label: "Lot (bursa IDX)",
      multiplier: 100,
      priceUnit: "lembar",
      hint: "1 lot = 100 lembar. Catat jumlah dalam lot; harga per lembar.",
    },
    {
      value: "lembar",
      label: "Lembar (saham)",
      multiplier: 1,
      priceUnit: "lembar",
      hint: "Langsung dalam jumlah lembar saham (tanpa konversi lot).",
    },
  ],
  crypto: [
    {
      value: "coin",
      label: "Koin",
      multiplier: 1,
      priceUnit: "coin",
      hint: "Jumlah dalam koin aset (mis. 0,5 BTC). Harga per 1 koin.",
    },
    {
      value: "unit",
      label: "Unit",
      multiplier: 1,
      priceUnit: "unit",
      hint: "Satuan generik jika tidak memakai istilah koin.",
    },
  ],
  gold: [
    {
      value: "gram",
      label: "Gram",
      multiplier: 1,
      priceUnit: "gram",
      hint: "Umum di Indonesia (Antam, Pegadaian): harga & kepemilikan per gram.",
    },
    {
      value: "oz",
      label: "Troy ounce (oz)",
      multiplier: 1,
      priceUnit: "oz",
      hint: "Harga internasional per troy ounce. Qty juga dalam oz.",
    },
    {
      value: "kg",
      label: "Kilogram",
      multiplier: 1,
      priceUnit: "kg",
      hint: "Untuk posisi besar; harga per kilogram.",
    },
  ],
  mutual_fund: [
    {
      value: "unit",
      label: "Unit",
      multiplier: 1,
      priceUnit: "unit",
      hint: "Standar reksa dana: jumlah unit & NAV (harga) per unit.",
    },
  ],
  other: [
    {
      value: "unit",
      label: "Unit",
      multiplier: 1,
      priceUnit: "unit",
    },
    {
      value: "pcs",
      label: "Buah / pcs",
      multiplier: 1,
      priceUnit: "pcs",
    },
  ],
};

const CUSTOM_UNIT = "__custom__";

export function defaultUnitPreset(type: InvestmentAssetType): AssetUnitPreset {
  return INVESTMENT_ASSET_UNIT_PRESETS[type][0];
}

export function defaultUnitNameForType(type: string): string {
  const t = type as InvestmentAssetType;
  if (INVESTMENT_ASSET_UNIT_PRESETS[t]?.length) return INVESTMENT_ASSET_UNIT_PRESETS[t][0].value;
  return "unit";
}

export function findUnitPreset(type: string, unitName: string): AssetUnitPreset | undefined {
  const t = type as InvestmentAssetType;
  const key = unitName.trim().toLowerCase();
  return INVESTMENT_ASSET_UNIT_PRESETS[t]?.find((p) => p.value.toLowerCase() === key);
}

export function resolveUnitConfig(type: string, unitName: string) {
  const preset = findUnitPreset(type, unitName);
  if (preset) {
    return {
      unitName: preset.value,
      multiplier: preset.multiplier,
      priceUnit: preset.priceUnit,
      hint: preset.hint,
    };
  }
  const u = unitName.trim() || defaultUnitNameForType(type);
  return { unitName: u, multiplier: 1, priceUnit: u, hint: undefined as string | undefined };
}

export function unitSelectValue(type: string, unitName: string): string {
  return findUnitPreset(type, unitName) ? unitName.trim().toLowerCase() : CUSTOM_UNIT;
}

export { CUSTOM_UNIT };
