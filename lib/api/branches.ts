import { api } from "./client";

export interface Branch {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: string;
}

export const branchesApi = {
  async list(): Promise<{ branches: Branch[] }> {
    const res = await api.get("/branches");
    return res.data;
  },
  async create(input: { name: string; slug: string }): Promise<{ branch: Branch }> {
    const res = await api.post("/branches", input);
    return res.data;
  },
};
