"use client";

import {
  StockTransactionKindPage,
  transferDetail,
} from "@/components/inventory/stock-transaction-kind-page";
import { CreateTransferPanel } from "@/components/inventory/stock-transaction-create-panel";

export default function TransfersPage() {
  return (
    <StockTransactionKindPage
      config={{
        kind: "transfer",
        title: "Transfer Stok",
        description: "Pindahkan barang antar gudang — HPP mengikuti barang yang dipindah.",
        helpTopic: "operations-transfer",
        createTitle: "Transfer",
        CreatePanel: CreateTransferPanel,
        renderDetail: transferDetail,
      }}
    />
  );
}
