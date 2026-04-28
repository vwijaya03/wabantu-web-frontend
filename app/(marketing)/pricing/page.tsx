import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const tiers = [
  {
    name: "Starter",
    price: "Gratis",
    period: "selama 14 hari",
    description: "Cocok untuk warung & toko yang baru mau coba.",
    cta: "Mulai Gratis",
    highlighted: false,
    features: [
      "1 nomor WhatsApp",
      "Sampai 500 percakapan / bulan",
      "AI auto-reply dasar",
      "Knowledge base manual",
      "Inbox terpusat",
    ],
  },
  {
    name: "Growth",
    price: "Rp 199rb",
    period: "/ bulan",
    description: "Buat UMKM yang sudah ramai dan butuh otomatisasi penuh.",
    cta: "Pilih Growth",
    highlighted: true,
    features: [
      "1 nomor WhatsApp",
      "Sampai 5.000 percakapan / bulan",
      "AI dengan knowledge base + PDF/Excel upload",
      "Hand-off ke staff",
      "Analitik dasar",
      "Email support",
    ],
  },
  {
    name: "Business",
    price: "Rp 599rb",
    period: "/ bulan",
    description: "Untuk bisnis multi-cabang atau brand dengan tim CS.",
    cta: "Hubungi Sales",
    highlighted: false,
    features: [
      "Sampai 3 nomor WhatsApp",
      "Percakapan tak terbatas",
      "Multi-staff dengan role",
      "Analitik lengkap",
      "API access (webhook)",
      "Priority support",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <Badge variant="secondary" className="mb-4">Harga sederhana</Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Pilih paket yang sesuai
        </h1>
        <p className="mt-4 text-muted-foreground">
          Bisa upgrade atau downgrade kapan saja. Tanpa kontrak panjang.
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
            {tier.highlighted && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Paling populer
              </Badge>
            )}
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

      <p className="mt-12 text-center text-sm text-muted-foreground">
        Harga di atas belum termasuk biaya percakapan dari Meta. UMKM kecil
        biasanya tidak akan tersentuh biaya tambahan karena Meta menggratiskan
        1.000 percakapan service per bulan.
      </p>
    </div>
  );
}
