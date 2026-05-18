"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { branchesApi } from "@/lib/api/branches";
import { usePlan } from "@/hooks/use-plan";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function BranchesPage() {
  const { hasMultiBranch } = usePlan();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["branches"], queryFn: () => branchesApi.list(), enabled: hasMultiBranch });
  const createMut = useMutation({
    mutationFn: () => branchesApi.create({ name, slug }),
    onSuccess: () => { toast.success("Cabang dibuat"); setName(""); setSlug(""); void qc.invalidateQueries({ queryKey: ["branches"] }); },
    onError: (e) => toast.error(toApiError(e).message),
  });
  if (!hasMultiBranch) return <PageHeader title="Multi Cabang" description="Tersedia di paket Pro." />;
  return (
    <>
      <PageHeader title="Multi Cabang" description="Nomor WA dan tim per cabang." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Tambah cabang</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
            <Button onClick={() => createMut.mutate()} disabled={!name || !slug}>Simpan</Button>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Cabang</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? "Memuat..." : (data?.branches ?? []).map((b) => (
              <div key={b.id} className="rounded border p-3 text-sm"><p className="font-medium">{b.name}</p><p className="text-muted-foreground">{b.slug}{b.isDefault ? " · default" : ""}</p></div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
