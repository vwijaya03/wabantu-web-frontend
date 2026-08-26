"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminTenant } from "@/lib/api/admin";
import {
  tenantAccessApi,
  type AccessScope,
  type TenantAccessRequest,
} from "@/lib/api/tenant-access";
import { toApiError } from "@/lib/api/client";
import {
  IMPERSONATION_MODULE_OPTIONS,
  accessStatusLabel,
} from "@/lib/dashboard/impersonation-modules";
import { useTenantImpersonation } from "@/hooks/use-tenant-impersonation";
import { toast } from "sonner";

type AccessState = {
  status: TenantAccessRequest["status"] | "none";
  canImpersonate: boolean;
};

export function TenantAccessActionButton({
  tenant,
  accessState,
}: {
  tenant: AdminTenant;
  accessState: AccessState;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<AccessScope>("full");
  const [modules, setModules] = useState<string[]>([]);
  const qc = useQueryClient();
  const { impersonateMut, isBusy } = useTenantImpersonation();

  const requestMut = useMutation({
    mutationFn: () =>
      tenantAccessApi.create({
        tenantId: tenant.id,
        reason: reason.trim(),
        requestedScope: scope,
        requestedModules: scope === "limited" ? modules : [],
      }),
    onSuccess: () => {
      toast.success("Permintaan akses dikirim ke owner tenant");
      setDialogOpen(false);
      setReason("");
      setScope("full");
      setModules([]);
      void qc.invalidateQueries({ queryKey: ["admin-access-requests"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const toggleModule = (moduleId: string) => {
    setModules((current) =>
      current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId],
    );
  };

  if (accessState.status === "pending") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">{accessStatusLabel("pending")}</Badge>
        <Button size="sm" variant="secondary" disabled>
          Menunggu
        </Button>
      </div>
    );
  }

  if (accessState.canImpersonate) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="default">{accessStatusLabel("approved")}</Badge>
        <Button
          size="sm"
          disabled={isBusy || !tenant.isActive}
          onClick={() => impersonateMut.mutate(tenant.id)}
        >
          Pantau
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {accessState.status !== "none" ? (
          <Badge
            variant={
              accessState.status === "rejected" ? "destructive" : "secondary"
            }
          >
            {accessStatusLabel(accessState.status)}
          </Badge>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          disabled={!tenant.isActive}
          onClick={() => setDialogOpen(true)}
        >
          Minta Akses
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Minta akses ke {tenant.companyName}</DialogTitle>
            <DialogDescription>
              Owner tenant akan menerima notifikasi dan dapat menyetujui atau
              menolak permintaan Anda. Tanpa persetujuan, mode Pantau tidak
              tersedia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`reason-${tenant.id}`}>Alasan permintaan</Label>
              <Textarea
                id={`reason-${tenant.id}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Contoh: investigasi tiket support #1234"
              />
            </div>

            <div className="space-y-2">
              <Label>Cakupan yang diminta</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={scope === "full" ? "default" : "outline"}
                  onClick={() => setScope("full")}
                >
                  Akses penuh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={scope === "limited" ? "default" : "outline"}
                  onClick={() => setScope("limited")}
                >
                  Modul tertentu
                </Button>
              </div>
            </div>

            {scope === "limited" ? (
              <div className="space-y-2 rounded-md border p-3">
                <Label>Modul</Label>
                <ul className="space-y-2">
                  {IMPERSONATION_MODULE_OPTIONS.map((opt) => (
                    <li key={opt.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        id={`req-mod-${tenant.id}-${opt.id}`}
                        className="mt-1 size-4 rounded border"
                        checked={modules.includes(opt.id)}
                        onChange={() => toggleModule(opt.id)}
                      />
                      <label htmlFor={`req-mod-${tenant.id}-${opt.id}`}>
                        {opt.label}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={
                requestMut.isPending ||
                reason.trim().length < 5 ||
                (scope === "limited" && modules.length === 0)
              }
              onClick={() => requestMut.mutate()}
            >
              {requestMut.isPending ? "Mengirim…" : "Kirim permintaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
