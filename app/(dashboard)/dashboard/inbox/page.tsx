import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";

export default function InboxPage() {
  return (
    <>
      <PageHeader
        title="Inbox"
        description="Semua percakapan WhatsApp pelanggan dalam satu layar."
        actions={<Badge variant="outline">0 belum dibaca</Badge>}
      />
      <Card className="overflow-hidden">
        <div className="grid h-[600px] grid-cols-1 lg:grid-cols-[300px_1fr]">
          <div className="border-r bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Belum ada percakapan</p>
            <p className="mt-1 text-xs">
              Setelah WhatsApp tersambung, percakapan akan muncul di sini.
            </p>
          </div>
          <CardContent className="flex flex-col items-center justify-center gap-2 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm font-medium">Pilih percakapan</p>
            <p className="text-xs text-muted-foreground">
              Atau biarkan AI yang membalas otomatis sesuai konteks bisnis.
            </p>
          </CardContent>
        </div>
      </Card>
    </>
  );
}
