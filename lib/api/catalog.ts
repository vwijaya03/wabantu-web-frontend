import { api } from "./client";

export interface CatalogItem {
  id: string;
  externalCode: string;
  name: string;
  description?: string;
  sellPrice?: number;
  sellUnit?: string;
  isActive: boolean;
  barcode?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export const catalogApi = {
  async list(): Promise<{ items: CatalogItem[]; total: number }> {
    const res = await api.get("/business/catalog");
    return res.data;
  },
  async create(input: {
    externalCode: string;
    name: string;
    description?: string;
    sellPrice?: number;
    sellUnit?: string;
    isActive?: boolean;
  }): Promise<CatalogItem> {
    const res = await api.post("/business/catalog", input);
    return res.data;
  },
  async update(
    id: string,
    input: Partial<{
      name: string;
      description: string;
      sellPrice: number;
      sellUnit: string;
      isActive: boolean;
    }>,
  ): Promise<CatalogItem> {
    const res = await api.patch(`/business/catalog/${id}`, input);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/business/catalog/${id}`);
  },
};
