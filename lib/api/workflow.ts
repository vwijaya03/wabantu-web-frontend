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
  async update(
    id: string,
    input: {
      name: string;
      triggerValue: string;
      triggerType?: string;
      actionType?: string;
      actionPayload?: Record<string, unknown>;
      priority?: number;
      isActive?: boolean;
    },
  ): Promise<{ rule: WorkflowRule }> {
    const res = await api.patch(`/workflows/${id}`, input);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },
};

/** Extract reply text from actionPayload (API may return object or JSON string). */
export function workflowReplyText(payload: Record<string, unknown> | string): string {
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload) as { replyText?: string };
      return parsed.replyText ?? "";
    } catch {
      return "";
    }
  }
  const t = payload.replyText;
  return typeof t === "string" ? t : "";
}
