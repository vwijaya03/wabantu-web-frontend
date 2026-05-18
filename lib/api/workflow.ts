import { api } from "./client";

export interface WorkflowRule {
  id: string;
  name: string;
  triggerType: string;
  triggerValue: string;
  actionType: string;
  actionPayload: Record<string, unknown>;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export const workflowApi = {
  async list(): Promise<{ rules: WorkflowRule[] }> {
    const res = await api.get("/workflows");
    return res.data;
  },
  async create(input: {
    name: string;
    triggerValue: string;
    triggerType?: string;
    actionType?: string;
    actionPayload?: Record<string, unknown>;
    priority?: number;
  }): Promise<{ rule: WorkflowRule }> {
    const res = await api.post("/workflows", input);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },
};
