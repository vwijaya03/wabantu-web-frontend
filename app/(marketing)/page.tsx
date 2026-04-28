import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Inbox,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { env } from "@/lib/env";

const features = [
  {
    icon: MessageCircle,
    title: "Connect WhatsApp",
    desc: "Integrasi resmi Meta Cloud API. Tinggal masukin nomor & token, langsung jalan.",
  },
  {
    icon: Bot,
    title: "AI Auto-Reply 24/7",
    desc: "Pelanggan tanya harga, lokasi, ongkir? Dibalas otomatis pakai info bisnis Anda.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base",
    desc: "Isi FAQ atau upload pricelist. AI pakai itu sebagai sumber jawaban.",
  },
  {
    icon: Inbox,
    title: "Inbox Terpusat",
    desc: "Semua chat masuk ke satu dashboard. Owner & staff bisa take-over kapan aja.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-Tenant",
    desc: "Data setiap bisnis terisolasi. Aman buat banyak cabang atau klien.",
  },
  {
    icon: Zap,
    title: "Closing Naik",
    desc: "Customer dibales dalam hitungan detik. Nggak ada lagi chat nyangkut.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.04_158/40%),transparent_60%)]"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center">
          <Badge variant="success" className="mb-6">
            <Sparkles className="mr-1 h-3 w-3" />
            Untuk UMKM Indonesia
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Balas chat WhatsApp pelanggan{" "}
            <span className="text-primary">otomatis</span>, 24 jam sehari.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            {env.appName} menghubungkan WhatsApp bisnis Anda dengan AI yang tahu
            harga, lokasi, jam buka, dan jawaban FAQ. Closing naik, owner bisa
            tidur tenang.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Coba Gratis 14 Hari
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">Lihat Harga</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Tanpa kartu kredit • Bisa connect dalam 5 menit
          </p>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Yang penting untuk UMKM, sudah kami siapkan
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tanpa fitur ribet — fokus ke yang membuat penjualan naik.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="border-muted">
              <CardContent className="p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Setup hanya 3 langkah
              </h2>
              <ol className="mt-8 space-y-6">
                {[
                  {
                    n: "1",
                    title: "Daftar & connect WhatsApp",
                    desc: "Hubungkan nomor WA bisnis via Meta Cloud API atau gateway.",
                  },
                  {
                    n: "2",
                    title: "Isi info bisnis & FAQ",
                    desc: "Nama bisnis, harga, jam buka, area kirim, jawaban umum.",
                  },
                  {
                    n: "3",
                    title: "AI mulai membalas otomatis",
                    desc: "Owner tetap bisa take-over kapan saja dari Inbox.",
                  },
                ].map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {s.n}
                    </div>
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <Card className="overflow-hidden border-primary/20 shadow-lg">
              <CardContent className="space-y-4 bg-gradient-to-b from-primary/5 to-transparent p-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </span>
                  WABantu AI · membalas otomatis
                </div>
                <div className="space-y-3 text-sm">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2">
                    Halo, masih buka kak? Kalau pesen sekarang sampe besok ya?
                  </div>
                  <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-primary-foreground">
                    Halo kak! Toko buka sampai jam 21:00 🌙. Kalau order
                    sebelum jam 18:00, paket bisa dikirim hari ini & sampai
                    besok pagi (Jabodetabek). Mau cek menu kami?
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2">
                    Mau dong, harga paket family berapa?
                  </div>
                  <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-primary-foreground">
                    Paket Family Rp 95.000 (untuk 4 orang) — bonus es teh 1L.
                    Mau dipesankan sekarang? 😊
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-3xl font-bold tracking-tight">FAQ</h2>
        <div className="mt-8 space-y-6 text-sm">
          <div>
            <p className="font-semibold">Apakah harus punya akun WhatsApp Business API?</p>
            <p className="mt-1 text-muted-foreground">
              Untuk Meta Cloud API ya. Kami akan dampingi proses verifikasi
              nomor di Meta Business Manager. Alternatif gateway juga bisa
              kalau belum siap verifikasi.
            </p>
          </div>
          <div>
            <p className="font-semibold">Berapa biaya per pesan?</p>
            <p className="mt-1 text-muted-foreground">
              Meta menggratiskan 1.000 percakapan service per bulan. Selebihnya
              dihitung ~Rp 80–250 per percakapan tergantung kategori.
            </p>
          </div>
          <div>
            <p className="font-semibold">Apakah AI bisa salah jawab?</p>
            <p className="mt-1 text-muted-foreground">
              AI hanya menjawab dari info dan FAQ yang Anda isi. Owner bisa
              ambil alih kapan saja, dan setiap jawaban AI bisa direview
              di dashboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
