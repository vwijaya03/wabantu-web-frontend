import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Selaras dengan api-go/billing/billing.go (PlanCatalog).
 * Trial 7 hari saat register — tidak ditampilkan sebagai kartu harga di sini.
 */
const tiers = [
  {
    name: "Starter",
    price: "Rp 299.000",
    period: "/ bulan",
    description: "Inbox + AI untuk satu nomor WA — tanpa broadcast & workflow.",
    cta: "Mulai",
    highlighted: false,
    features: [
      "1 nomor WhatsApp · 1 seat",
      "1.500 percakapan AI / bulan",
      "2 juta token AI / bulan (Haiku)",
      "256 MB storage",
      "Balasan AI dalam chat pelanggan (Meta: gratis di jendela 24 jam)",
    ],
  },
  {
    name: "Business",
    price: "Rp 799.000",
    period: "/ bulan",
    description: "UMKM ramai: hybrid AI, broadcast, workflow, CRM.",
    cta: "Pilih Business",
    highlighted: true,
    features: [
      "2 nomor WhatsApp · 3 seat",
      "6.000 percakapan AI / bulan · 8 juta token AI",
      "Broadcast 500 kontak / bulan",
      "500 eksekusi workflow / bulan · 2 GB storage",
      "AI hybrid Haiku + Sonnet",
    ],
  },
  {
    name: "Pro",
    price: "Rp 1.999.000",
    period: "/ bulan",
    description: "Multi cabang, banyak channel, kuota operasi tinggi.",
    cta: "Pilih Pro",
    highlighted: false,
    features: [
      "10 nomor WhatsApp · 10 seat",
      "20.000 percakapan AI / bulan · 30 juta token AI",
      "Broadcast 10.000 kontak / bulan",
      "5.000 workflow / bulan · 10 GB storage",
      "Prioritas Sonnet · multi cabang · API access",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <Badge variant="secondary" className="mb-4">
          Harga berlangganan
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Paket dengan batas yang jelas
        </h1>
        <p className="mt-4 text-muted-foreground">
          Trial 7 hari: semua fitur bisa dicoba, kuota kecil. Upgrade kapan saja lewat dashboard Billing.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={
              tier.highlighted
                ? "relative border-primary shadow-lg"
                : "border-muted"
            }
          >
            {tier.highlighted ? (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Paling populer
              </Badge>
            ) : null}
            <CardContent className="space-y-6 p-8">
              <div>
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight">
                  {tier.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {tier.period}
                </span>
              </div>
              <Button
                asChild
                className="w-full"
                variant={tier.highlighted ? "default" : "outline"}
              >
                <Link href="/register">{tier.cta}</Link>
              </Button>
              <ul className="space-y-3 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 space-y-3 rounded-lg border bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Biaya WhatsApp (Meta), terpisah dari langganan WABantu</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Balasan biasa &amp; AI auto-reply setelah pelanggan chat dulu (dalam jendela 24 jam):{" "}
            <strong className="text-foreground">biasanya gratis</strong> dari Meta.
          </li>
          <li>
            Broadcast promosi memakai <strong className="text-foreground">template marketing</strong> — Meta
            menagih per pesan terkirim (Indonesia ~Rp 400–500/pesan, 2026). Kuota di atas = batas platform;
            biaya Meta broadcast ditanggung tenant / kebijakan pass-through.
          </li>
          <li>
            Model lama &quot;1.000 percakapan gratis semua jenis&quot; sudah tidak berlaku; yang umum adalah
            layanan dalam jendela CS + aturan per kategori pesan. Detail: dokumentasi Meta WhatsApp Pricing.
          </li>
        </ul>
      </div>
    </div>
  );
}
