import { api } from "./client";

export interface Order {
  id: string;
  conversationId: string;
  contactId: string;
  items: Array<{
    name: string;
    variant: string;
    qty: number;
    unitPrice: number;
  }>;
  status: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  trackingNumber?: string;
  courier?: string;
  createdAt: string;
}

export const ordersApi = {
  async list(): Promise<{ orders: Order[] }> {
    const res = await api.get("/orders");
    return res.data;
  },
  async create(input: {
    conversationId: string;
    contactId: string;
    items: Order["items"];
    notes?: string;
  }): Promise<Order> {
    const res = await api.post("/orders", input);
    return res.data;
  },
  async update(
    id: string,
    input: Partial<{ status: string; trackingNumber: string; courier: string }>,
  ): Promise<Order> {
    const res = await api.patch(`/orders/${id}`, input);
    return res.data;
  },
  async cancel(id: string): Promise<Order> {
    const res = await api.patch(`/orders/${id}/cancel`);
    return res.data;
  },
};
