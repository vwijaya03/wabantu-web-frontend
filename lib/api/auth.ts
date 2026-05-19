import { clearClientSession, setAccessToken } from "@/lib/auth/session";
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

type AuthSessionPayload = {
  user: AuthUser;
  accessToken: string;
  expiresInSeconds?: number;
};

function persistAccessToken(accessToken: string): void {
  setAccessToken(accessToken);
}

export const authApi = {
  async register(p: RegisterPayload): Promise<AuthUser> {
    const res = await api.post<AuthSessionPayload>("/auth/register", p);
    persistAccessToken(res.data.accessToken);
    return res.data.user;
  },
  async login(p: LoginPayload): Promise<AuthUser> {
    const res = await api.post<AuthSessionPayload>("/auth/login", p);
    persistAccessToken(res.data.accessToken);
    return res.data.user;
  },
  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      clearClientSession();
    }
  },
  async me(): Promise<AuthUser> {
    const res = await api.get<AuthUser>("/auth/me");
    return res.data;
  },
};
