"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { PageHeader } from "@/components/dashboard/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import {
  tenantAccessApi,
  isAccessGrantActive,
  type AccessScope,
  type TenantAccessRequest,
} from "@/lib/api/tenant-access";
import { toApiError } from "@/lib/api/client";
import {
  ACCESS_DURATION_OPTIONS,
  IMPERSONATION_MODULE_OPTIONS,
  accessStatusLabel,
  formatAccessExpiry,
  formatImpersonationScope,
} from "@/lib/dashboard/impersonation-modules";
import { toast } from "sonner";

function RequestRow({
  request,
  onApprove,
  onReject,
  onRevoke,
  busy,
}: {
  request: TenantAccessRequest;
  onApprove: (request: TenantAccessRequest) => void;
  onReject: (request: TenantAccessRequest) => void;
  onRevoke: (request: TenantAccessRequest) => void;
  busy: boolean;
}) {
  const isActiveGrant = isAccessGrantActive(request);

  return (
    <div className="rounded-lg border p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium">
            {request.requesterName || request.requesterEmail || "Operator platform"}
          </p>
          <p className="text-muted-foreground">{request.reason}</p>
          <p className="text-xs text-muted-foreground">
            Diminta:{" "}
            {formatImpersonationScope(request.requestedScope, request.requestedModules)}
            {" · "}
            {new Date(request.createdAt).toLocaleString("id-ID")}
          </p>
          {request.status === "approved" && request.grantedScope ? (
            <p className="text-xs text-muted-foreground">
              Diberikan:{" "}
              {formatImpersonationScope(request.grantedScope, request.grantedModules)}
              {" · "}
              Berlaku hingga: {formatAccessExpiry(request.expiresAt)}
            </p>
          ) : null}
          {request.rejectReason ? (
            <p className="text-xs text-destructive">Alasan tolak: {request.rejectReason}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              request.status === "pending"
                ? "outline"
                : request.status === "approved"
                  ? "default"
                  : "secondary"
            }
          >
            {accessStatusLabel(request.status)}
          </Badge>
          {request.status === "pending" ? (
            <>
              <Button size="sm" disabled={busy} onClick={() => onApprove(request)}>
                Setujui
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onReject(request)}
              >
                Tolak
              </Button>
            </>
          ) : null}
          {isActiveGrant ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => onRevoke(request)}
            >
              Cabut akses
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AccessRequestsPage() {
  const { user } = useAuth();
  const tenantReady = useTenantQueryEnabled();
  const qc = useQueryClient();

  const [approveTarget, setApproveTarget] = useState<TenantAccessRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TenantAccessRequest | null>(null);
  const [grantedScope, setGrantedScope] = useState<AccessScope>("full");
  const [grantedModules, setGrantedModules] = useState<string[]>([]);
  const [durationHours, setDurationHours] = useState<number | null>(24);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-access-requests"],
    queryFn: () => tenantAccessApi.listForTenant(),
    enabled: tenantReady && user?.role === "owner",
  });

  const respondMut = useMutation({
    mutationFn: (input: {
      id: string;
      action: "approve" | "reject";
      grantedScope?: AccessScope;
      grantedModules?: string[];
      durationHours?: number | null;
      rejectReason?: string;
    }) =>
      tenantAccessApi.respond(input.id, {
        action: input.action,
        grantedScope: input.grantedScope,
        grantedModules: input.grantedModules,
        durationHours: input.durationHours,
        rejectReason: input.rejectReason,
      }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "approve"
          ? "Permintaan akses disetujui"
          : "Permintaan akses ditolak",
      );
      setApproveTarget(null);
      setRejectTarget(null);
      setRejectReason("");
      void qc.invalidateQueries({ queryKey: ["tenant-access-requests"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => tenantAccessApi.revoke(id),
    onSuccess: () => {
      toast.success("Akses operator dicabut");
      void qc.invalidateQueries({ queryKey: ["tenant-access-requests"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const { pending, history } = useMemo(() => {
    const list = data?.requests ?? [];
    const pendingList = list.filter((r) => r.status === "pending");
    const historyList = list.filter((r) => r.status !== "pending");
    return { pending: pendingList, history: historyList };
  }, [data?.requests]);

  const busy = respondMut.isPending || revokeMut.isPending;

  const toggleGrantedModule = (moduleId: string) => {
    setGrantedModules((current) =>
      current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId],
    );
  };

  const openApprove = (request: TenantAccessRequest) => {
    setApproveTarget(request);
    setGrantedScope(request.requestedScope);
    setGrantedModules([...request.requestedModules]);
    setDurationHours(24);
  };

  if (user?.role !== "owner") {
    return (
      <PageHeader
        title="Permintaan Akses"
        description="Hanya owner yang dapat menyetujui permintaan akses operator platform."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Permintaan Akses"
        description="Kelola permintaan operator WABantu untuk memantau tenant Anda."
      />

      <Card>
        <CardHeader>
          <CardTitle>Menunggu persetujuan ({pending.length})</CardTitle>
          <CardDescription>
            Operator platform tidak dapat masuk tanpa persetujuan Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak ada permintaan yang menunggu.
            </p>
          ) : (
            pending.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                busy={busy}
                onApprove={openApprove}
                onReject={setRejectTarget}
                onRevoke={(r) => revokeMut.mutate(r.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat</CardTitle>
          <CardDescription>
            Permintaan yang sudah disetujui, ditolak, dicabut, atau kedaluwarsa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
          ) : (
            history.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                busy={busy}
                onApprove={openApprove}
                onReject={setRejectTarget}
                onRevoke={(r) => revokeMut.mutate(r.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!approveTarget}
        onOpenChange={(open) => !open && setApproveTarget(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Setujui permintaan akses</DialogTitle>
            <DialogDescription>
              Tentukan modul dan durasi akses untuk operator platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cakupan akses</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={grantedScope === "full" ? "default" : "outline"}
                  onClick={() => setGrantedScope("full")}
                >
                  Akses penuh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={grantedScope === "limited" ? "default" : "outline"}
                  onClick={() => setGrantedScope("limited")}
                >
                  Modul tertentu
                </Button>
              </div>
            </div>

            {grantedScope === "limited" ? (
              <div className="space-y-2 rounded-md border p-3">
                <Label>Modul yang diizinkan</Label>
                <ul className="space-y-2">
                  {IMPERSONATION_MODULE_OPTIONS.map((opt) => (
                    <li key={opt.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        id={`grant-mod-${opt.id}`}
                        className="mt-1 size-4 rounded border"
                        checked={grantedModules.includes(opt.id)}
                        onChange={() => toggleGrantedModule(opt.id)}
                      />
                      <label htmlFor={`grant-mod-${opt.id}`}>{opt.label}</label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Durasi akses</Label>
              <div className="flex flex-wrap gap-2">
                {ACCESS_DURATION_OPTIONS.map((opt) => (
                  <Button
                    key={opt.label}
                    type="button"
                    size="sm"
                    variant={durationHours === opt.hours ? "default" : "outline"}
                    onClick={() => setDurationHours(opt.hours)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Batal
            </Button>
            <Button
              disabled={
                busy ||
                (grantedScope === "limited" && grantedModules.length === 0)
              }
              onClick={() => {
                if (!approveTarget) return;
                respondMut.mutate({
                  id: approveTarget.id,
                  action: "approve",
                  grantedScope,
                  grantedModules:
                    grantedScope === "limited" ? grantedModules : [],
                  durationHours,
                });
              }}
            >
              Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak permintaan akses</DialogTitle>
            <DialogDescription>
              Berikan alasan singkat — operator akan menerima notifikasi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Alasan penolakan</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={busy || rejectReason.trim().length < 3}
              onClick={() => {
                if (!rejectTarget) return;
                respondMut.mutate({
                  id: rejectTarget.id,
                  action: "reject",
                  rejectReason: rejectReason.trim(),
                });
              }}
            >
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
