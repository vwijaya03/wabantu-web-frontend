import { api } from "./client";

export interface CatalogItemPrice {
  priceTypeId: string;
  priceTypeCode?: string;
  priceTypeLabel?: string;
  price: number;
}

export interface CatalogItem {
  id: string;
  externalCode: string;
  name: string;
  description?: string;
  sellPrice?: number;
  effectiveSellPrice?: number;
  prices?: CatalogItemPrice[];
  sellUnit?: string;
  isActive: boolean;
  barcode?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListCatalogParams {
  q?: string;
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
  contactId?: string;
}

export interface ListCatalogResponse {
  items: CatalogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CatalogInput {
  externalCode: string;
  name: string;
  description?: string;
  sellPrice?: number;
  prices?: CatalogItemPrice[];
  sellUnit?: string;
  isActive?: boolean;
  barcode?: string;
}

export type CatalogUpdateInput = Partial<Omit<CatalogInput, "externalCode">>;

export const catalogApi = {
  async list(params: ListCatalogParams = {}): Promise<ListCatalogResponse> {
    const res = await api.get("/business/catalog", { params });
    return res.data;
  },
  async create(input: CatalogInput): Promise<CatalogItem> {
    const res = await api.post("/business/catalog", input);
    return res.data;
  },
  async update(id: string, input: CatalogUpdateInput): Promise<CatalogItem> {
    const res = await api.patch(`/business/catalog/${id}`, input);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/business/catalog/${id}`);
  },
};
