import { api } from "./client";

export interface Subscription {
  id: string;
  planCode: "starter" | "basic" | "business" | "pro";
  planName: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  status: "active" | "past_due" | "canceled";
  provider: "midtrans" | "xendit" | null;
  providerRef: string | null;
}

export interface PlanLimits {
  channels: number;
  seats: number;
  aiConversations: number;
  aiTokens: number;
  broadcastContacts: number;
  storageMb: number;
  workflowExecs: number;
}

export interface Plan {
  code: "starter" | "business" | "pro";
  name: string;
  amountIdr: number;
  limits: PlanLimits;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  planCode: "starter" | "basic" | "business" | "pro" | string;
  planName: string;
  amountIdr: number;
  status: "pending" | "issued" | "paid" | "void";
  issuedAt: string;
  paidAt: string | null;
}

export interface TopUpOption {
  code: string;
  name: string;
  amountIdr: number;
  aiTokens: number;
  aiConversations: number;
  validForPeriod: string;
}

export interface BillingOverview {
  subscription: Subscription;
  plans: Plan[];
  topUpOptions: TopUpOption[];
  invoices: Invoice[];
  pendingCheckout?: Invoice | null;
}

export interface SelectPlanResult {
  subscription: Subscription;
  pendingInvoice?: Invoice;
}

export interface CreateTopUpResult {
  topUp: TopUpOption;
  pendingInvoice?: Invoice;
}

export const billingApi = {
  async overview(): Promise<BillingOverview> {
    const res = await api.get<BillingOverview>("/billing/overview");
    return res.data;
  },
  async selectPlan(input: {
    planCode: "starter" | "business" | "pro";
    provider?: "midtrans" | "xendit";
  }): Promise<SelectPlanResult> {
    const res = await api.post<SelectPlanResult>("/billing/select-plan", {
      ...input,
      provider: input.provider ?? "midtrans",
    });
    return res.data;
  },
  async createTopUp(code: string): Promise<CreateTopUpResult> {
    const res = await api.post<CreateTopUpResult>("/billing/top-up", { code });
    return res.data;
  },
};
