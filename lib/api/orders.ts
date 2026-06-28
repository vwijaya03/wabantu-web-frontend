import { api } from "./client";

export interface ShippingAddress {
  name?: string;
  phone?: string;
  street?: string;
  rt?: string;
  rw?: string;
  kelurahan?: string;
  kecamatan?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

export type PaymentStatus = "unpaid" | "proof_submitted" | "verified" | "rejected";

export interface PaymentProofMeta {
  amount?: number;
  bank?: string;
  accountNumber?: string;
  accountName?: string;
  date?: string;
  confidence?: number;
  flags?: string[];
  rejectReason?: string;
  fileHash?: string;
  rejectionCount?: number;
  proofBlocked?: boolean;
  blockedNotified?: boolean;
}

export interface Order {
  id: string;
  orderNumber?: string;
  conversationId: string;
  contactId: string;
  contactDisplayName?: string;
  contactPhone?: string;
  shippingAddress?: ShippingAddress;
  items: Array<{
    lineId?: string;
    catalogItemId?: string;
    externalCode?: string;
    name: string;
    variant?: string;
    size?: string;
    color?: string;
    qty: number;
    unitPrice: number;
    sellUnit?: string;
    warehouseId?: string;
  }>;
  status: string;
  paymentStatus?: PaymentStatus;
  paymentProofMessageId?: string;
  paymentProofSubmittedAt?: string;
  paymentProofVerifiedAt?: string;
  paymentProofVerifiedBy?: string;
  paymentProofMeta?: PaymentProofMeta;
  notes?: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  trackingNumber?: string;
  courier?: string;
  incomeWalletId?: string;
  updatedAt?: string;
  createdAt: string;
}

export interface ListOrdersParams {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ListOrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOrderInput {
  conversationId?: string;
  contactId?: string;
  items: Order["items"];
  notes?: string;
  status?: string;
  trackingNumber?: string;
  courier?: string;
  shippingCost?: number;
  incomeWalletId?: string;
}

export interface UpdateOrderInput {
  contactId?: string;
  items?: Order["items"];
  notes?: string;
  status?: string;
  trackingNumber?: string;
  courier?: string;
  shippingCost?: number;
  incomeWalletId?: string;
}

export const ordersApi = {
  async list(params: ListOrdersParams = {}): Promise<ListOrdersResponse> {
    const res = await api.get("/orders", { params });
    return res.data;
  },
  async create(input: CreateOrderInput): Promise<Order> {
    const res = await api.post("/orders", input);
    return res.data;
  },
  async update(id: string, input: UpdateOrderInput): Promise<Order> {
    const res = await api.patch(`/orders/${id}`, input);
    return res.data;
  },
  async batchUpdateStatus(input: { ids: string[]; status: string }): Promise<{ updated: number }> {
    const res = await api.patch("/order-status/batch", input);
    return res.data;
  },
  async batchDelete(ids: string[]): Promise<{ deleted: number }> {
    const res = await api.patch("/order-delete/batch", { ids });
    return res.data;
  },
  async cancel(id: string): Promise<Order> {
    const res = await api.patch(`/orders/${id}/cancel`);
    return res.data;
  },
  async verifyPaymentProof(id: string): Promise<Order> {
    const res = await api.post(`/orders/${id}/payment-proof/verify`);
    return res.data;
  },
  async rejectPaymentProof(id: string, input?: { reason?: string }): Promise<Order> {
    const res = await api.post(`/orders/${id}/payment-proof/reject`, input ?? {});
    return res.data;
  },
  async unblockPaymentProof(id: string): Promise<Order> {
    const res = await api.post(`/orders/${id}/payment-proof/unblock`);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/orders/${id}`);
  },
};
