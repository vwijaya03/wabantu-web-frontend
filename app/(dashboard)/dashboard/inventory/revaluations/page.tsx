"use client";

import {
  StockTransactionKindPage,
  revaluationDetail,
} from "@/components/inventory/stock-transaction-kind-page";
import { CreateRevaluationPanel } from "@/components/inventory/stock-transaction-create-panel";

export default function RevaluationsPage() {
  return (
    <StockTransactionKindPage
      config={{
        kind: "revaluation",
        title: "Revaluasi HPP",
        description: "Ubah harga pokok tanpa mengubah qty — selisih nilai tercatat ke jurnal.",
        helpTopic: "operations-revalue",
        createTitle: "Revaluasi",
        CreatePanel: CreateRevaluationPanel,
        renderDetail: revaluationDetail,
      }}
    />
  );
}
