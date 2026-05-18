import { api } from "./client";

export interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
}

export const teamApi = {
  async list(): Promise<{ members: TeamMember[]; total: number }> {
    const res = await api.get("/team/members");
    return res.data;
  },
  async invite(input: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ member: TeamMember }> {
    const res = await api.post("/team/members", input);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/team/members/${id}`);
  },
};
