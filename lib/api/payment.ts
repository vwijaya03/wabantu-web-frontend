import { api } from "./client";

export interface QRISResponse {
  transactionId: string;
  orderId: string;
  qrUrl: string;
  expiresAt: string;
}

export interface PaymentStatus {
  id: string;
  orderId: string;
  status: string;
  amountIdr: number;
  qrUrl: string;
}

export const paymentApi = {
  async createQRIS(input: {
    invoiceId: string;
    amountIdr: number;
    description: string;
  }): Promise<QRISResponse> {
    const res = await api.post("/payment/create-qris", input);
    return res.data;
  },
  async status(id: string): Promise<PaymentStatus> {
    const res = await api.get(`/payment/${id}/status`);
    return res.data;
  },
};
