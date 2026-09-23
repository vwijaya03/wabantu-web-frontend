"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, toApiError } from "@/lib/api/client";
import { useState } from "react";

type Domain = {
  id: string;
  hostname: string;
  status: string;
  verificationToken?: string;
  cnameTarget: string;
  dnsRecordName: string;
  dnsRecordValue: string;
};

export default function CustomDomainPage() {
  const qc = useQueryClient();
  const [hostname, setHostname] = useState("");
  const { data } = useQuery({
    queryKey: ["custom-domains"],
    queryFn: () => api.get<{ items: Domain[] }>("/api/v1/storefront/custom-domains").then((r) => r.data),
  });

  const addMut = useMutation({
    mutationFn: () => api.post<Domain>("/api/v1/storefront/custom-domains", { hostname }),
    onSuccess: () => {
      toast.success("Domain ditambahkan — selesaikan verifikasi DNS");
      setHostname("");
      qc.invalidateQueries({ queryKey: ["custom-domains"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const verifyMut = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/storefront/custom-domains/${id}/verify`),
    onSuccess: () => {
      toast.success("Domain terverifikasi");
      qc.invalidateQueries({ queryKey: ["custom-domains"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <>
      <PageHeader
        title="Custom Domain"
        description="Verifikasi domain via DNS TXT sebelum routing aktif. CNAME mengarah ke custom.wabantu.id."
      />
      <Card className="mb-6">
        <CardHeader><CardTitle>Tambah domain</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <div className="min-w-[240px] flex-1 space-y-2">
            <Label>Hostname</Label>
            <Input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="toko.brandanda.com" />
          </div>
          <Button className="self-end" onClick={() => addMut.mutate()} disabled={addMut.isPending || !hostname}>
            Tambah
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {(data?.items ?? []).map((d) => (
          <Card key={d.id}>
            <CardContent className="space-y-2 pt-6 text-sm">
              <div className="font-medium">{d.hostname} · {d.status}</div>
              {d.status === "pending" ? (
                <>
                  <p className="text-muted-foreground">
                    TXT <code>{d.dnsRecordName}</code> = <code>{d.dnsRecordValue}</code>
                  </p>
                  <p className="text-muted-foreground">CNAME {d.hostname} → {d.cnameTarget}</p>
                  <Button size="sm" variant="outline" onClick={() => verifyMut.mutate(d.id)} disabled={verifyMut.isPending}>
                    Verifikasi DNS
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
