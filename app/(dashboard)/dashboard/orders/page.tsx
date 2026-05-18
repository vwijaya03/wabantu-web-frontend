"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { ordersApi } from "@/lib/api/orders";

export default function OrdersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["orders"], queryFn: () => ordersApi.list() });
  return (
    <>
      <PageHeader title="Pesanan" description="Pesanan dari percakapan WhatsApp." />
      <Card>
        <CardHeader><CardTitle>Daftar pesanan</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? <p className="text-sm text-muted-foreground">Memuat...</p> : (data?.orders ?? []).map((o) => (
            <div key={o.id} className="rounded border p-3 text-sm">
              <p className="font-medium">#{o.id.slice(0, 8)} · {o.status}</p>
              <p className="text-muted-foreground">Total Rp {o.total.toLocaleString("id-ID")}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
