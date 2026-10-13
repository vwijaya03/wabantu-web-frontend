"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLogin } from "@/lib/api/admin-client";
import { toApiError } from "@/lib/api/errors";
import { setAdminSession } from "@/lib/auth/admin-session";

/** Halaman login superadmin. Sengaja TIDAK ditautkan dari /login client. */
function describeError(err: unknown): string {
  const e = toApiError(err);
  if (e.status === 429) {
    const ra = err instanceof AxiosError ? err.response?.headers?.["retry-after"] : undefined;
    return ra ? `Terlalu banyak percobaan. Coba lagi dalam ${ra} detik.` : "Terlalu banyak percobaan. Coba lagi nanti.";
  }
  if (e.status === 423) return "Login dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi nanti.";
  if (e.status === 401 || e.status === 403) return "Email atau password salah.";
  if (e.status === 404) return "Endpoint login admin belum tersedia di backend.";
  if (e.status === 0 || e.status >= 500) return "Gagal, coba lagi.";
  return "Login gagal. Periksa data lalu coba lagi.";
}

function safeNext(n: string | null): string {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard/admin/ai-providers";
}

function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { accessToken, expiresAt } = await adminLogin(email.trim(), password);
      setAdminSession(accessToken, expiresAt);
      setPassword("");
      router.replace(safeNext(params.get("next")));
    } catch (err) {
      // Jangan pernah log password / body request.
      setError(describeError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4" autoComplete="on">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Login Platform Admin</h1>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Masuk
        </Button>
      </form>
    </div>
  );
}

export default function PlatformAdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
