import { api } from "./client";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: "owner" | "staff" | "super_admin";
  tenant: { id: string; slug: string; name: string };
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  businessName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  async register(p: RegisterPayload): Promise<AuthUser> {
    const res = await api.post<{ user: AuthUser; accessToken: string }>(
      "/auth/register",
      p,
    );
    return res.data.user;
  },
  async login(p: LoginPayload): Promise<AuthUser> {
    const res = await api.post<{ user: AuthUser; accessToken: string }>(
      "/auth/login",
      p,
    );
    return res.data.user;
  },
  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },
  async me(): Promise<AuthUser> {
    const res = await api.get<AuthUser>("/auth/me");
    return res.data;
  },
};
