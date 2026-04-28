import { api } from "./client";

export interface BusinessProfile {
  id: string;
  businessName: string;
  description: string | null;
  address: string | null;
  openingHours: string | null;
  productsServices: string | null;
  basePricing: string | null;
  deliveryArea: string | null;
  greetingTemplate: string | null;
  tone: "friendly" | "formal" | "casual";
  aiEnabled: boolean;
}

export type UpdateBusinessProfileInput = Partial<
  Omit<BusinessProfile, "id">
>;

export const businessApi = {
  async get(): Promise<BusinessProfile> {
    const res = await api.get<BusinessProfile>("/business/profile");
    return res.data;
  },
  async update(input: UpdateBusinessProfileInput): Promise<BusinessProfile> {
    const res = await api.patch<BusinessProfile>("/business/profile", input);
    return res.data;
  },
};
