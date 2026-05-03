"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { leadsApi, type Lead } from "@/lib/api/leads";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

const STATUS_OPTIONS: Lead["status"][] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

export default function ContactsPage() {
  const qc = useQueryClient();
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => leadsApi.list(),
    refetchInterval: 8000,
  });
  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Lead["status"] }) =>
      leadsApi.update(id, { status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["leads"] }),
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Leads otomatis dari percakapan WhatsApp customer."
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Memuat leads...
            </div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Belum ada lead. Data akan otomatis muncul setelah ada chat masuk
              yang terdeteksi sebagai minat beli.
            </div>
          ) : (
            <div className="divide-y">
              {leads.map((lead) => (
                <div key={lead.id} className="grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_1fr]">
                  <div>
                    <p className="text-sm font-semibold">{lead.name || "Tanpa nama"}</p>
                    <p className="text-xs text-muted-foreground">{lead.phoneNumber}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Minat: {lead.productInterest || "-"} · Budget: {lead.budget || "-"} ·
                      Lokasi: {lead.location || "-"}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Badge variant={lead.status === "won" ? "success" : "secondary"}>
                      {lead.status}
                    </Badge>
                  </div>
                  <div className="flex items-center">
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                      value={lead.status}
                      onChange={(e) =>
                        updateMut.mutate({
                          id: lead.id,
                          status: e.target.value as Lead["status"],
                        })
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleString("id-ID")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
