import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Inbox,
  MessageSquare,
  Plug,
  TrendingUp,
} from "lucide-react";
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
import { getServerUser, getServerWhatsappChannels } from "@/lib/api/server";

export default async function DashboardOverviewPage() {
  const [user, channels] = await Promise.all([
    getServerUser(),
    getServerWhatsappChannels(),
  ]);
  const hasConnectedWhatsapp = channels.some((c) => c.status === "connected");

  const setupSteps = [
    {
      key: "register",
      label: "Buat akun bisnis",
      done: true,
      href: "#",
    },
    {
      key: "wa",
      label: "Sambungkan WhatsApp",
      done: hasConnectedWhatsapp,
      href: "/dashboard/whatsapp/onboarding",
    },
    {
      key: "profile",
      label: "Lengkapi info bisnis",
      done: false,
      href: "/dashboard/ai-settings",
    },
    {
      key: "kb",
      label: "Isi minimal 5 FAQ",
      done: false,
      href: "/dashboard/knowledge-base",
    },
  ];

  const stats = [
    { label: "Pesan masuk hari ini", value: "0", icon: Inbox, hint: "—" },
    { label: "Dibalas AI", value: "0", icon: Bot, hint: "0% rate" },
    { label: "Open rate", value: "—", icon: TrendingUp, hint: "Butuh data" },
    { label: "Avg. respon", value: "—", icon: MessageSquare, hint: "Butuh data" },
  ];

  return (
    <>
      <PageHeader
        title={`Halo, ${user?.name?.split(" ")[0] || "Owner"} 👋`}
        description={`Berikut ringkasan ${user?.tenant.name ?? "bisnis Anda"} hari ini.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {s.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup checklist</CardTitle>
          <CardDescription>
            Selesaikan langkah berikut supaya AI siap balas pelanggan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {setupSteps.map((step) => (
            <div
              key={step.key}
              className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className={
                    step.done
                      ? "h-5 w-5 text-primary"
                      : "h-5 w-5 text-muted-foreground/40"
                  }
                />
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  {step.done ? (
                    <Badge variant="success" className="mt-1">
                      Selesai
                    </Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Belum dikerjakan
                    </p>
                  )}
                </div>
              </div>
              {!step.done && (
                <Button asChild size="sm" variant="outline">
                  <Link href={step.href}>
                    Kerjakan
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-4 w-4 text-primary" />
              Status WhatsApp
            </CardTitle>
            <CardDescription>
              Hubungkan nomor bisnis Anda untuk mulai menerima chat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={hasConnectedWhatsapp ? "success" : "outline"}>
              {hasConnectedWhatsapp ? "Tersambung" : "Belum tersambung"}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {hasConnectedWhatsapp
                ? "Nomor bisnis Anda sudah aktif dan siap menerima chat masuk."
                : "Hubungkan nomor bisnis Anda untuk mulai menerima chat masuk."}
            </p>
            <Button asChild size="sm" variant={hasConnectedWhatsapp ? "outline" : "default"}>
              <Link
                href={
                  hasConnectedWhatsapp
                    ? "/dashboard/whatsapp"
                    : "/dashboard/whatsapp/onboarding"
                }
              >
                {hasConnectedWhatsapp ? "Kelola koneksi" : "Connect sekarang"}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              AI status
            </CardTitle>
            <CardDescription>
              AI akan aktif setelah info bisnis & FAQ minimal terisi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="warning">Menunggu konfigurasi</Badge>
            <p className="text-sm text-muted-foreground">
              Lengkapi profil bisnis dan minimal 5 entri FAQ.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/ai-settings">Lengkapi profil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
