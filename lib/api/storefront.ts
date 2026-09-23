import axios from "axios";
import { api } from "@/lib/api/client";
import { env } from "@/lib/env";

const publicApi = axios.create({ baseURL: env.apiUrl, timeout: 30_000 });

export type StoreConfig = {
  enabled: boolean;
  storeTitle?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string;
};

export const storefrontApi = {
  getConfig() {
    return api.get<StoreConfig & { customTokens?: Record<string, unknown> }>("/api/v1/storefront/config").then((r) => r.data);
  },
  updateConfig(body: StoreConfig & { customTokens?: Record<string, unknown> }) {
    return api.put("/api/v1/storefront/config", body).then((r) => r.data);
  },
  publicStore(tenantSlug: string) {
    return publicApi.get<StoreConfig>(`/api/v1/public/store/${tenantSlug}`).then((r) => r.data);
  },
  publicProducts(tenantSlug: string, q = "", page = 1) {
    return publicApi
      .get<{ items: StoreProduct[]; page: number }>(`/api/v1/public/store/${tenantSlug}/products`, {
        params: { q, page },
      })
      .then((r) => r.data);
  },
  createCart(tenantSlug: string) {
    return publicApi.post<{ cartToken: string }>(`/api/v1/public/store/${tenantSlug}/cart`).then((r) => r.data);
  },
  checkout(
    tenantSlug: string,
    cartToken: string,
    body: {
      guestName: string;
      guestPhone: string;
      shippingAddress: { street: string; city: string; province: string; postalCode: string };
    },
  ) {
    return publicApi
      .post<{ orderId: string; total: number; payment: { qrUrl: string; expiresAt: string } }>(
        `/api/v1/public/store/${tenantSlug}/cart/${cartToken}/checkout`,
        body,
      )
      .then((r) => r.data);
  },
};
