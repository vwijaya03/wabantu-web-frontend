import { api } from "./client";

export interface Subscription {
  id: string;
  planCode: "starter" | "basic" | "pro";
  planName: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  status: "active" | "past_due" | "canceled";
  provider: "midtrans" | "xendit" | null;
  providerRef: string | null;
}

export interface Plan {
  code: "starter" | "basic" | "pro";
  name: string;
  amountIdr: number;
  limits: { channels: number; seats: number };
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  planCode: "starter" | "basic" | "pro";
  planName: string;
  amountIdr: number;
  status: "issued" | "paid" | "void";
  issuedAt: string;
  paidAt: string | null;
}

export const billingApi = {
  async overview(): Promise<{
    subscription: Subscription;
    plans: Plan[];
    invoices: Invoice[];
  }> {
    const res = await api.get("/billing/overview");
    return res.data;
  },
  async selectPlan(input: {
    planCode: "starter" | "basic" | "pro";
    provider?: "midtrans" | "xendit";
  }): Promise<Subscription> {
    const res = await api.post<Subscription>("/billing/select-plan", input);
    return res.data;
  },
};
