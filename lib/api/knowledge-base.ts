import { api } from "./client";

export interface KbEntry {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  isActive: boolean;
  source: "manual" | "pdf" | "excel" | "csv";
  createdAt: string;
}

interface ListResponse {
  items: KbEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export const knowledgeBaseApi = {
  async list(params: { search?: string; page?: number; pageSize?: number } = {}): Promise<ListResponse> {
    const res = await api.get<ListResponse>("/knowledge-base", { params });
    return res.data;
  },
  async create(input: {
    question: string;
    answer: string;
    category?: string;
  }): Promise<KbEntry> {
    const res = await api.post<KbEntry>("/knowledge-base", input);
    return res.data;
  },
  async update(
    id: string,
    input: Partial<Pick<KbEntry, "question" | "answer" | "category" | "isActive">>,
  ): Promise<KbEntry> {
    const res = await api.patch<KbEntry>(`/knowledge-base/${id}`, input);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/knowledge-base/${id}`);
  },
};
