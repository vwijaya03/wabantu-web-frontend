import { api } from "./client";

export const shippingApi = {
  async provinces(): Promise<{ provinces: Array<{ id: string; name: string }> }> {
    const res = await api.get("/shipping/provinces");
    return res.data;
  },
  async cities(provinceId: string): Promise<{ cities: Array<{ id: string; name: string }> }> {
    const res = await api.get("/shipping/cities", { params: { provinceId } });
    return res.data;
  },
  async cost(input: {
    origin: string;
    destination: string;
    weight: number;
    courier: string;
  }): Promise<{ results: Array<{ service: string; cost: number; etd: string }> }> {
    const res = await api.get("/shipping/cost", { params: input });
    return res.data;
  },
};
