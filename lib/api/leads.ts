import { api } from "./client";

export interface Lead {
  id: string;
  phoneNumber: string;
  name: string | null;
  productInterest: string | null;
  budget: string | null;
  location: string | null;
  status: "new" | "contacted" | "qualified" | "won" | "lost";
  notes: string | null;
  createdAt: string;
}

export const leadsApi = {
  async list(status?: Lead["status"]): Promise<Lead[]> {
    const res = await api.get<Lead[]>("/leads", {
      params: status ? { status } : undefined,
    });
    return res.data;
  },
  async update(
    id: string,
    patch: Partial<Pick<Lead, "status" | "notes">>,
  ): Promise<Lead> {
    const res = await api.patch<Lead>(`/leads/${id}`, patch);
    return res.data;
  },
};
