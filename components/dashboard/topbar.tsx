"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { adminApi } from "@/lib/api/admin";
import { hasTenantDashboardAccess, isPlatformOperatorHome } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

function initials(name?: string | null, email?: string) {
  const src = (name || email || "").trim();
  if (!src) return "?";
  return src
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const isSuperAdmin = user?.role === "super_admin";
  const platformHome = isPlatformOperatorHome(user);

  const { data: tenantsData } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => adminApi.listTenants(),
    enabled: isSuperAdmin,
    staleTime: 60_000,
  });

  const impMut = useMutation({
    mutationFn: (tenantId: string) => adminApi.impersonate(tenantId),
    onSuccess: async () => {
      await refresh();
      await qc.invalidateQueries();
      toast.success("Memantau tenant — mode internal aktif");
      router.push("/dashboard");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const stopMut = useMutation({
    mutationFn: () => adminApi.stopImpersonation(),
    onSuccess: async () => {
      await refresh();
      await qc.invalidateQueries();
      toast.success("Kembali ke konsol platform");
      router.push("/dashboard/admin");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-3">
        {isSuperAdmin ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 px-3 text-sm font-medium"
              >
                {platformHome ? (
                  <>
                    <span className="grid h-5 w-5 place-items-center rounded bg-primary/10 text-primary text-[10px] font-bold">
                      W
                    </span>
                    WABantu Platform
                  </>
                ) : (
                  <>
                    <span className="grid h-5 w-5 place-items-center rounded bg-primary/10 text-primary text-[10px] font-bold">
                      {user?.tenant?.name?.charAt(0).toUpperCase() ?? "T"}
                    </span>
                    {user?.tenant?.name ?? "Tenant"}
                  </>
                )}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
              <DropdownMenuLabel>Pilih tenant</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user?.impersonation?.active && (
                <>
                  <DropdownMenuItem onClick={() => stopMut.mutate()}>
                    Keluar dari tenant saat ini
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {(tenantsData?.tenants ?? []).map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  disabled={impMut.isPending || user?.tenant?.id === t.id}
                  onClick={() => impMut.mutate(t.id)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{t.companyName}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.ownerEmail || t.schemaName}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          user?.tenant && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 px-3 text-sm font-medium"
              asChild
            >
              <span>
                <span className="grid h-5 w-5 place-items-center rounded bg-primary/10 text-primary text-[10px] font-bold">
                  {user.tenant.name.charAt(0).toUpperCase()}
                </span>
                {user.tenant.name}
              </span>
            </Button>
          )
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">
                  {initials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">
                {user?.name || user?.email}
              </span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{user?.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user?.email}
                {isSuperAdmin && " · Platform admin"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hasTenantDashboardAccess(user) && (
              <>
                <DropdownMenuItem asChild>
                  <a href="/dashboard/team">
                    <User className="mr-2 h-4 w-4" />
                    Profile saya
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/dashboard/ai-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Pengaturan
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {isSuperAdmin && (
              <DropdownMenuItem asChild>
                <a href="/dashboard/admin">Konsol Admin</a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => void logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
