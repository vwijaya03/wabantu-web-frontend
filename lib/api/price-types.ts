import { api } from "./client";
import { apiGetConfig } from "./read-options";

export interface PriceType {
  id: string;
  code: string;
  label: string;
  displayOrder: number;
  isDefault: boolean;
  isSystem: boolean;
  isActive: boolean;
}

export interface ListPriceTypesParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ListPriceTypesResponse {
  items: PriceType[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PriceTypeInput {
  code: string;
  label: string;
  displayOrder?: number;
  isDefault?: boolean;
}

export type PriceTypeUpdateInput = Partial<
  Pick<PriceTypeInput, "label" | "displayOrder" | "isDefault"> & { isActive: boolean }
>;

export const priceTypesApi = {
  async list(params: ListPriceTypesParams = {}, signal?: AbortSignal): Promise<ListPriceTypesResponse> {
    const res = await api.get<ListPriceTypesResponse>("/business/price-types", apiGetConfig(params, signal));
    return res.data;
  },
  async create(input: PriceTypeInput): Promise<PriceType> {
    const res = await api.post<PriceType>("/business/price-types", input);
    return res.data;
  },
  async update(id: string, input: PriceTypeUpdateInput): Promise<PriceType> {
    const res = await api.patch<PriceType>(`/business/price-types/${id}`, input);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/business/price-types/${id}`);
  },
};
