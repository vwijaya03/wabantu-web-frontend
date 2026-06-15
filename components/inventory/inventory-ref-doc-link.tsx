"use client";

import { useRouter } from "next/navigation";
import { TransactionDocLink } from "@/components/inventory/transaction-doc-link";

const STOCK_TXN_KINDS = new Set([
  "adjustment",
  "transfer",
  "opening_balance",
  "revaluation",
]);

function docPageForRef(refType: string, refId: string): string | null {
  switch (refType) {
    case "bill":
      return `/dashboard/inventory/bills?open=${refId}`;
    case "sales_return":
      return `/dashboard/inventory/sales-returns?open=${refId}`;
    case "order":
      return null;
    default:
      if (STOCK_TXN_KINDS.has(refType)) return null;
      return null;
  }
}

/** Opens stock-txn edit dialog or navigates to bill/retur detail page. */
export function InventoryRefDocLink({
  docNo,
  refType,
  refId,
  onOpenStockTxn,
}: {
  docNo: string;
  refType?: string;
  refId?: string;
  onOpenStockTxn: (id: string) => void;
}) {
  const router = useRouter();
  if (!refType || !refId) {
    return <span className="font-mono text-xs font-medium">{docNo}</span>;
  }

  const handleClick = () => {
    if (STOCK_TXN_KINDS.has(refType)) {
      onOpenStockTxn(refId);
      return;
    }
    const href = docPageForRef(refType, refId);
    if (href) router.push(href);
  };

  const canOpen = STOCK_TXN_KINDS.has(refType) || docPageForRef(refType, refId) !== null;
  if (!canOpen) {
    return <span className="font-mono text-xs font-medium">{docNo}</span>;
  }

  return <TransactionDocLink docNo={docNo} onClick={handleClick} className="text-xs" />;
}
