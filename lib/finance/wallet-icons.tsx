"use client";

import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  Banknote,
  Landmark,
  CreditCard,
  Smartphone,
  Bitcoin,
  TrendingUp,
  PiggyBank,
  Building2,
  CircleDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const WALLET_TYPE_COLORS: Record<string, string> = {
  cash: "#16A34A",
  bank: "#2563EB",
  ewallet: "#7C3AED",
  crypto: "#F59E0B",
  investment: "#0891B2",
  other: "#6B7280",
};

export const WALLET_ICON_MAP: Record<string, LucideIcon> = {
  wallet: Wallet,
  banknote: Banknote,
  landmark: Landmark,
  "credit-card": CreditCard,
  smartphone: Smartphone,
  bitcoin: Bitcoin,
  "trending-up": TrendingUp,
  "piggy-bank": PiggyBank,
  "building-2": Building2,
  "circle-dollar-sign": CircleDollarSign,
};

export function defaultWalletIconKey(type: string) {
  switch (type) {
    case "bank":
      return "landmark";
    case "ewallet":
      return "smartphone";
    case "crypto":
      return "bitcoin";
    case "investment":
      return "trending-up";
    default:
      return "wallet";
  }
}

export function resolveWalletAccent(color?: string, type?: string) {
  return color ?? WALLET_TYPE_COLORS[type ?? ""] ?? "#6B7280";
}

export function resolveWalletIconComponent(icon?: string, type?: string): LucideIcon {
  const key = icon || defaultWalletIconKey(type ?? "cash");
  return WALLET_ICON_MAP[key] ?? WALLET_ICON_MAP[defaultWalletIconKey(type ?? "cash")] ?? Wallet;
}

type WalletIconBadgeProps = {
  icon?: string;
  type: string;
  color?: string;
  size?: "sm" | "md";
  className?: string;
};

export function WalletIconBadge({ icon, type, color, size = "md", className }: WalletIconBadgeProps) {
  const accent = resolveWalletAccent(color, type);
  const IconComp = resolveWalletIconComponent(icon, type);
  const box = size === "sm" ? "h-8 w-8 rounded-md" : "h-10 w-10 rounded-lg";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center", box, className)}
      style={{ backgroundColor: `${accent}22` }}
    >
      <IconComp className={iconSize} style={{ color: accent }} />
    </div>
  );
}
