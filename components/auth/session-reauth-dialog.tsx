"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
import { getProfileHint } from "@/lib/auth/profile-hint";
import { isReauthSessionGone } from "@/lib/auth/reauth-errors";
import { clearClientSession } from "@/lib/auth/session";
import {
  resolveSessionReauth,
  SESSION_REAUTH_REQUIRED,
} from "@/lib/auth/session-reauth";
import { dispatchAuthSessionUpdated } from "@/lib/auth/session-sync";

export function SessionReauthDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hint = getProfileHint();

  useEffect(() => {
    const onRequired = () => {
      setPassword("");
      setOpen(true);
    };
    window.addEventListener(SESSION_REAUTH_REQUIRED, onRequired);
    return () => window.removeEventListener(SESSION_REAUTH_REQUIRED, onRequired);
  }, []);

  const goToLogin = useCallback(() => {
    setOpen(false);
    resolveSessionReauth(false);
    const path = window.location.pathname;
    window.location.replace(`/login?next=${encodeURIComponent(path)}`);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Masukkan password");
      return;
    }
    setSubmitting(true);
    try {
      const user = await authApi.reauth(password);
      dispatchAuthSessionUpdated(user);
      await queryClient.invalidateQueries();
      router.refresh();
      setOpen(false);
      setPassword("");
      resolveSessionReauth(true);
      toast.success("Sesi diperbarui");
    } catch (err) {
      const apiErr = toApiError(err);
      if (isReauthSessionGone(apiErr)) {
        toast.error(apiErr.message || "Sesi habis — silakan masuk ulang");
        clearClientSession();
        goToLogin();
        return;
      }
      if (apiErr.status === 401) {
        toast.error(apiErr.message || "Password salah");
        return;
      }
      toast.error(apiErr.message || "Gagal memperbarui sesi");
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    if (submitting) return;
    goToLogin();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Sesi perlu dikonfirmasi
          </DialogTitle>
          <DialogDescription>
            Anda tidak aktif cukup lama. Masukkan password lagi untuk melanjutkan di halaman ini — tidak perlu login
            dari awal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {hint?.email ? (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Akun: </span>
              <span className="font-medium">{hint.name ? `${hint.name} · ` : ""}{hint.email}</span>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="reauth-password">Password</Label>
            <div className="relative">
              <Input
                id="reauth-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password akun Anda"
                className="pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                autoFocus
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memverifikasi…
                </>
              ) : (
                "Lanjutkan"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={submitting}
              onClick={() => {
                clearClientSession();
                goToLogin();
              }}
            >
              Keluar dan masuk ulang
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
