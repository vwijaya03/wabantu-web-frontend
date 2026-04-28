import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Performa AI auto-reply dan kepuasan pelanggan."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total chat", value: "0" },
          { label: "Dijawab AI", value: "0" },
          { label: "Take-over manual", value: "0" },
          { label: "Avg. respon", value: "—" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-2 text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tren 30 hari</CardTitle>
        </CardHeader>
        <CardContent className="grid h-64 place-items-center text-sm text-muted-foreground">
          Belum ada data. Akan terisi otomatis setelah AI mulai membalas chat.
        </CardContent>
      </Card>
    </>
  );
}
