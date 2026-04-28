import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";

export default function ContactsPage() {
  return (
    <>
      <PageHeader
        title="Contacts"
        description="Daftar pelanggan yang pernah chat dengan bisnis Anda."
      />
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Belum ada kontak. Pelanggan otomatis tersimpan setelah chat masuk
          pertama kali.
        </CardContent>
      </Card>
    </>
  );
}
