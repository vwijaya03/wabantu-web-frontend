"use client";

import {
  StockTransactionKindPage,
  adjustmentDetail,
} from "@/components/inventory/stock-transaction-kind-page";
import { CreateAdjustmentPanel } from "@/components/inventory/stock-transaction-create-panel";

export default function AdjustmentsPage() {
  return (
    <StockTransactionKindPage
      config={{
        kind: "adjustment",
        title: "Penyesuaian Stok",
        description: "Koreksi stok manual (+/−) dengan nomor transaksi dan jejak audit.",
        helpTopic: "operations-adjust",
        createTitle: "Penyesuaian",
        CreatePanel: CreateAdjustmentPanel,
        renderDetail: adjustmentDetail,
      }}
    />
  );
}
