import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Billing"
        description="Paket berlangganan dan riwayat tagihan Anda."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Paket aktif
            <Badge variant="success">Trial 14 hari</Badge>
          </CardTitle>
          <CardDescription>
            Masa trial habis dalam waktu dekat. Pilih paket untuk melanjutkan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Starter (Gratis)</p>
            <p className="text-xs text-muted-foreground">
              Sampai 500 percakapan/bulan, 1 nomor WhatsApp
            </p>
          </div>
          <Button asChild>
            <Link href="/pricing">Lihat paket</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Riwayat invoice</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Belum ada invoice.
        </CardContent>
      </Card>
    </>
  );
}
