import { api } from "./client";

// ---------- types ----------

export type CostingMethod = "fifo" | "lifo" | "average";

export interface InventorySetting {
  setupCompleted: boolean;
  setupCompletedAt?: string;
  defaultCostingMethod: CostingMethod;
  blockNegativeStock: boolean;
  purchasePostsExpense: boolean;
  warehouseCount: number;
  wizardInterviewCompleted?: boolean;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  externalLocationId?: number;
  isDefault: boolean;
  isActive: boolean;
  isDeleted?: boolean;
  address?: string;
  note?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockRow {
  catalogItemId: string;
  itemName: string;
  externalCode: string;
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
  avgUnitCost: number;
  totalValue: number;
}

export interface MovementRow {
  id: string;
  catalogItemId: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  movementType: string;
  direction: "in" | "out";
  qty: number;
  unitCost: number;
  totalCost: number;
  qtyAfter: number;
  batchNo?: string;
  refType?: string;
  refId?: string;
  refDocNo?: string;
  refKind?: string;
  note?: string;
  createdAt: string;
}

export interface StockOpResult {
  transactionId?: string;
  docNo?: string;
  movementIds: string[];
  qtyAfter: number;
  totalCost: number;
  shortfall?: number;
}

export interface StockTransactionLine {
  id: string;
  catalogItemId: string;
  itemName?: string;
  warehouseId: string;
  warehouseName?: string;
  qty: number;
  unitCost: number;
}

export interface StockTransaction {
  id: string;
  docNo: string;
  kind: "adjustment" | "transfer" | "opening_balance" | "revaluation";
  transactionDate: string;
  note?: string;
  catalogItemId?: string;
  warehouseId?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  signedQty?: number;
  unitCost?: number;
  newUnitCost?: number;
  itemName?: string;
  warehouseName?: string;
  fromWarehouseName?: string;
  toWarehouseName?: string;
  lineCount?: number;
  lines?: StockTransactionLine[];
  createdAt: string;
}

export interface WizardAnswers {
  perishable: boolean;
  priceVolatile: boolean;
  highVolumeUniform: boolean;
  needBatchTracking: boolean;
  usesExpiryDates: boolean;
  seasonalStock: boolean;
  businessType: string;
  productDescription: string;
  stockTurnover: string;
  priceTrend: string;
  ownerNotes: string;
}

export interface WizardRecommendation {
  method: CostingMethod;
  reason: string;
  summary?: string;
  source?: "ai" | "rules";
}

export interface SkuConfig {
  catalogItemId: string;
  trackStock: boolean;
  isBundle: boolean;
  costingMethod?: CostingMethod;
  trackBatch: boolean;
  trackSerial: boolean;
  trackExpiry: boolean;
  baseUom?: string;
  effectiveMethod: CostingMethod;
}

export interface BundleComponentRow {
  childCatalogItemId: string;
  childName: string;
  childExternalCode: string;
  qty: number;
}

export interface PurchaseOrderLine {
  id?: string;
  catalogItemId: string;
  itemName?: string;
  warehouseId: string;
  description?: string;
  qtyOrdered: number;
  qtyReceived?: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  supplierName?: string;
  warehouseId?: string;
  status: string;
  transactionDate: string;
  note?: string;
  subtotal: number;
  lines: PurchaseOrderLine[];
  createdAt: string;
}

export interface BillLine {
  id?: string;
  catalogItemId: string;
  itemName?: string;
  warehouseId: string;
  purchaseOrderLineId?: string;
  description?: string;
  qty: number;
  unitCost: number;
  batchNo?: string;
  expiryDate?: string;
}

export interface Bill {
  id: string;
  billNo: string;
  purchaseOrderId?: string;
  supplierName?: string;
  status: string;
  transactionDate: string;
  note?: string;
  subtotal: number;
  lines: BillLine[];
  createdAt: string;
}

export interface InvoiceLine {
  catalogItemId: string;
  description: string;
  qty: number;
  unitPrice: number;
  cogs: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  orderId?: string;
  status: string;
  transactionDate: string;
  subtotal: number;
  totalCogs: number;
  lines: InvoiceLine[];
  createdAt: string;
}

export interface SalesReturn {
  id: string;
  returnNo: string;
  orderId?: string;
  status: string;
  transactionDate: string;
  note?: string;
  totalCost: number;
  lines: Array<{ catalogItemId: string; itemName?: string; warehouseId: string; qty: number; unitCost: number }>;
  createdAt: string;
}

// ---------- client ----------

export const inventoryApi = {
  // setting / setup
  async getSetting(): Promise<InventorySetting> {
    return (await api.get("/inventory/setting")).data;
  },
  async updateSetting(input: Partial<Pick<InventorySetting, "defaultCostingMethod" | "blockNegativeStock" | "purchasePostsExpense">>): Promise<InventorySetting> {
    return (await api.patch("/inventory/setting", input)).data;
  },
  async completeSetup(): Promise<InventorySetting> {
    return (await api.post("/inventory/setup/complete")).data;
  },

  // warehouses
  async listWarehouses(params?: { q?: string; page?: number; pageSize?: number; all?: boolean }): Promise<{
    warehouses: Warehouse[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return (await api.get("/inventory/warehouses", { params })).data;
  },
  async createWarehouse(input: { name: string; code?: string; address?: string; note?: string }): Promise<Warehouse> {
    return (await api.post("/inventory/warehouses", input)).data;
  },
  async updateWarehouse(id: string, input: { name: string; address?: string; note?: string; isActive?: boolean }): Promise<Warehouse> {
    return (await api.patch(`/inventory/warehouses/${id}`, input)).data;
  },
  async deleteWarehouse(id: string): Promise<void> {
    await api.delete(`/inventory/warehouses/${id}`);
  },
  async reactivateWarehouse(id: string): Promise<Warehouse> {
    return (await api.post(`/inventory/warehouses/${id}/reactivate`)).data;
  },

  // stock + movements
  async listStock(params: { warehouseId?: string; catalogItemId?: string; q?: string; page?: number; pageSize?: number } = {}): Promise<{ stock: StockRow[]; total: number; page: number; pageSize: number }> {
    return (await api.get("/inventory/stock", { params })).data;
  },
  async listMovements(params: { catalogItemId?: string; warehouseId?: string; type?: string; q?: string; page?: number; pageSize?: number } = {}): Promise<{ movements: MovementRow[]; total: number; page: number; pageSize: number }> {
    return (await api.get("/inventory/movements", { params })).data;
  },

  async listStockTransactions(params: { kind?: string; q?: string; page?: number; pageSize?: number } = {}): Promise<{ transactions: StockTransaction[]; total: number; page: number; pageSize: number }> {
    return (await api.get("/inventory/stock-transactions", { params })).data;
  },
  async getStockTransaction(id: string): Promise<StockTransaction> {
    return (await api.get(`/inventory/stock-transactions/${id}`)).data;
  },
  async deleteStockTransaction(id: string): Promise<void> {
    await api.delete(`/inventory/stock-transactions/${id}`);
  },
  async updateStockTransaction(id: string, input: Record<string, unknown>): Promise<StockTransaction> {
    return (await api.patch(`/inventory/stock-transactions/${id}`, input)).data;
  },
  async batchDeleteStockTransactions(ids: string[]): Promise<{ deleted: number; failed: number; errors?: string[] }> {
    return (await api.post("/inventory/stock-transactions/batch-delete", { ids })).data;
  },

  // manual movements
  async adjust(input: { catalogItemId: string; warehouseId: string; qty: number; unitCost?: number; batchNo?: string; expiryDate?: string; note?: string }): Promise<StockOpResult> {
    return (await api.post("/inventory/adjustments", input)).data;
  },
  async transfer(input: { catalogItemId: string; fromWarehouseId: string; toWarehouseId: string; qty: number; note?: string }): Promise<StockOpResult> {
    return (await api.post("/inventory/transfers", input)).data;
  },
  async openingBalance(entries: Array<{ catalogItemId: string; warehouseId: string; qty: number; unitCost: number; batchNo?: string; expiryDate?: string }>): Promise<{ transactionId: string; docNo: string; applied: number; movementIds: string[] }> {
    return (await api.post("/inventory/opening-balance", { entries })).data;
  },
  async revaluate(input: { catalogItemId: string; warehouseId: string; newUnitCost: number; note?: string }): Promise<StockOpResult> {
    return (await api.post("/inventory/revaluations", input)).data;
  },

  // bundles
  async getBundle(catalogItemId: string): Promise<{ catalogItemId: string; isBundle: boolean; components: BundleComponentRow[] }> {
    return (await api.get(`/inventory/bundles/${catalogItemId}/components`)).data;
  },
  async setBundle(catalogItemId: string, components: Array<{ childCatalogItemId: string; qty: number }>): Promise<{ catalogItemId: string; isBundle: boolean; components: BundleComponentRow[] }> {
    return (await api.put(`/inventory/bundles/${catalogItemId}/components`, { components })).data;
  },

  // purchase orders
  async listPurchaseOrders(params: { status?: string; q?: string; page?: number; pageSize?: number } = {}): Promise<{ purchaseOrders: PurchaseOrder[]; total: number; page: number; pageSize: number }> {
    return (await api.get("/inventory/purchase-orders", { params })).data;
  },
  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    return (await api.get(`/inventory/purchase-orders/${id}`)).data;
  },
  async createPurchaseOrder(input: { supplierName?: string; contactId?: string; warehouseId?: string; transactionDate?: string; note?: string; lines: Array<{ catalogItemId: string; warehouseId?: string; description?: string; qtyOrdered: number; unitCost: number }> }): Promise<PurchaseOrder> {
    return (await api.post("/inventory/purchase-orders", input)).data;
  },
  async closePurchaseOrder(id: string): Promise<PurchaseOrder> {
    return (await api.post(`/inventory/purchase-orders/${id}/close`)).data;
  },
  async cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
    return (await api.post(`/inventory/purchase-orders/${id}/cancel`)).data;
  },
  async deletePurchaseOrder(id: string): Promise<void> {
    await api.delete(`/inventory/purchase-orders/${id}`);
  },
  async updatePurchaseOrder(id: string, input: { supplierName?: string; contactId?: string; warehouseId?: string; transactionDate?: string; note?: string; lines: Array<{ catalogItemId: string; warehouseId?: string; description?: string; qtyOrdered: number; unitCost: number }> }): Promise<PurchaseOrder> {
    return (await api.patch(`/inventory/purchase-orders/${id}`, input)).data;
  },

  // bills
  async listBills(params: { q?: string; page?: number; pageSize?: number } = {}): Promise<{ bills: Bill[]; total: number; page: number; pageSize: number }> {
    return (await api.get("/inventory/bills", { params })).data;
  },
  async getBill(id: string): Promise<Bill> {
    return (await api.get(`/inventory/bills/${id}`)).data;
  },
  async deleteBill(id: string): Promise<void> {
    await api.delete(`/inventory/bills/${id}`);
  },
  async updateBill(id: string, input: { supplierName?: string; warehouseId?: string; transactionDate?: string; note?: string; lines: Array<{ catalogItemId: string; warehouseId?: string; purchaseOrderLineId?: string; description?: string; qty: number; unitCost: number; batchNo?: string }> }): Promise<Bill> {
    return (await api.patch(`/inventory/bills/${id}`, input)).data;
  },
  async createBill(input: { purchaseOrderId?: string; supplierName?: string; warehouseId?: string; transactionDate?: string; note?: string; lines: Array<{ catalogItemId: string; warehouseId?: string; purchaseOrderLineId?: string; description?: string; qty: number; unitCost: number; batchNo?: string; expiryDate?: string }> }): Promise<Bill> {
    return (await api.post("/inventory/bills", input)).data;
  },

  // invoices + returns
  async listInvoices(params: { q?: string; page?: number; pageSize?: number } = {}): Promise<{ invoices: Invoice[]; total: number; page: number; pageSize: number }> {
    return (await api.get("/inventory/invoices", { params })).data;
  },
  async getInvoice(id: string): Promise<Invoice> {
    return (await api.get(`/inventory/invoices/${id}`)).data;
  },
  async createInvoiceFromOrder(orderId: string): Promise<Invoice> {
    return (await api.post(`/inventory/invoices/from-order/${orderId}`)).data;
  },
  async deleteInvoice(id: string): Promise<void> {
    await api.delete(`/inventory/invoices/${id}`);
  },
  async listSalesReturns(params: { q?: string; page?: number; pageSize?: number } = {}): Promise<{ salesReturns: SalesReturn[]; total: number; page: number; pageSize: number }> {
    return (await api.get("/inventory/sales-returns", { params })).data;
  },
  async getSalesReturn(id: string): Promise<SalesReturn> {
    return (await api.get(`/inventory/sales-returns/${id}`)).data;
  },
  async createSalesReturn(input: { orderId: string; note?: string; lines: Array<{ catalogItemId: string; warehouseId?: string; qty: number }> }): Promise<SalesReturn> {
    return (await api.post("/inventory/sales-returns", input)).data;
  },
  async deleteSalesReturn(id: string): Promise<void> {
    await api.delete(`/inventory/sales-returns/${id}`);
  },
  async updateSalesReturn(id: string, input: { note?: string; lines: Array<{ catalogItemId: string; warehouseId?: string; qty: number }> }): Promise<SalesReturn> {
    return (await api.patch(`/inventory/sales-returns/${id}`, input)).data;
  },

  // recalc / wizard / sku / backfill
  async recalculate(catalogItemId?: string): Promise<{ recomputed: number }> {
    return (await api.post("/inventory/recalculate", { catalogItemId: catalogItemId ?? "" })).data;
  },
  async wizardRecommend(answers: WizardAnswers): Promise<{
    recommendation: WizardRecommendation;
    tokensUsed?: number;
    tokenQuotaRemaining?: number;
    tokenQuotaLimit?: number;
  }> {
    return (await api.post("/inventory/wizard/recommend", answers)).data;
  },
  async getSku(catalogItemId: string): Promise<SkuConfig> {
    return (await api.get(`/inventory/skus/${catalogItemId}`)).data;
  },
  async updateSku(catalogItemId: string, input: Partial<{ trackStock: boolean; costingMethod: string; trackBatch: boolean; trackSerial: boolean; trackExpiry: boolean; baseUom: string }>): Promise<SkuConfig> {
    return (await api.patch(`/inventory/skus/${catalogItemId}`, input)).data;
  },
  async backfillOrders(execute: boolean, issuesLimit?: number): Promise<BackfillOrdersResult> {
    return (await api.post("/inventory/backfill/orders", {
      execute,
      ...(issuesLimit != null ? { issuesLimit } : {}),
    })).data;
  },
};

export type BackfillStockShortage = {
  catalogItemId: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  qtyRequired: number;
  qtyAvailable: number;
  qtyShort: number;
};

export type BackfillOrderIssue = {
  orderId: string;
  orderRef: string;
  status: string;
  message?: string;
  shortages?: BackfillStockShortage[];
};

export type BackfillSuggestedOpening = {
  catalogItemId: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  minQty: number;
};

export type BackfillOrdersResult = {
  preview: boolean;
  pendingOrders: number;
  sufficientOrders?: number;
  processed: number;
  failed: number;
  insufficientCount?: number;
  issueCount?: number;
  issuesTruncated?: boolean;
  failureCount?: number;
  failuresTruncated?: boolean;
  insufficient?: string[];
  failures?: string[];
  issues?: BackfillOrderIssue[];
  suggestedOpening?: BackfillSuggestedOpening[];
};

export const COSTING_METHOD_LABELS: Record<CostingMethod, string> = {
  fifo: "FIFO (masuk pertama keluar pertama)",
  lifo: "LIFO (masuk terakhir keluar pertama)",
  average: "Average (rata-rata tertimbang)",
};

export function formatStockQty(qty: number): string {
  return String(Math.round(qty * 1e4) / 1e4);
}

export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  opening_balance: "Saldo awal",
  purchase_receive: "Penerimaan (Bill)",
  sale_issue: "Penjualan keluar",
  sale_cancel_restore: "Batal pesanan",
  return_in: "Retur masuk",
  adjustment_plus: "Penyesuaian +",
  adjustment_minus: "Penyesuaian -",
  transfer_out: "Transfer keluar",
  transfer_in: "Transfer masuk",
  write_off: "Write-off",
  revaluation_cost: "Revaluasi HPP",
};

export function movementTypeLabel(t: string): string {
  return MOVEMENT_TYPE_LABELS[t] ?? t;
}
