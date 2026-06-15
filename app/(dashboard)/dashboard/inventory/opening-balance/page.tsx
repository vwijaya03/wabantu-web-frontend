"use client";

import {
  StockTransactionKindPage,
  openingDetail,
} from "@/components/inventory/stock-transaction-kind-page";
import { CreateOpeningBalancePanel } from "@/components/inventory/stock-transaction-create-panel";

export default function OpeningBalancePage() {
  return (
    <StockTransactionKindPage
      config={{
        kind: "opening_balance",
        title: "Saldo Awal Stok",
        description: "Isi stok awal per SKU — satu nomor transaksi per submit (banyak baris).",
        helpTopic: "operations-opening",
        createTitle: "Saldo Awal",
        CreatePanel: CreateOpeningBalancePanel,
        renderDetail: openingDetail,
      }}
    />
  );
}
