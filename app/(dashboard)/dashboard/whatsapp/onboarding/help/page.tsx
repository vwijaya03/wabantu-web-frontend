import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WhatsappOnboardingHelpPage() {
  return (
    <>
      <PageHeader
        title="Panduan Connect WhatsApp"
        description="Ikuti langkah ini pelan-pelan. Tidak perlu skill teknis."
      />

      <Card>
        <CardHeader>
          <CardTitle>Yang wajib Anda siapkan</CardTitle>
          <CardDescription>
            Hanya 3 hal ini dulu, sisanya tinggal klik-klik.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>1) Akun Facebook aktif (bisa login normal)</p>
          <p>2) Nomor WhatsApp Business yang ingin dipakai</p>
          <p>3) Koneksi internet stabil</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Langkah connect untuk pemula</CardTitle>
          <CardDescription>
            Lakukan berurutan dari atas ke bawah.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>1) Buka halaman Onboarding WhatsApp.</p>
          <p>2) Isi Nama Channel, Nomor WhatsApp Business, Meta App ID, dan Meta App Secret.</p>
          <p>3) Centang “Saya sudah punya akun Facebook aktif”.</p>
          <p>4) Klik “Generate OAuth URL”.</p>
          <p>5) Login Facebook saat diminta, lalu klik Izinkan/Continue.</p>
          <p>6) Setelah selesai, Anda akan kembali ke halaman WABantu otomatis.</p>
          <p>
            7) Tunggu notifikasi sukses. Jika sukses, channel Anda akan muncul
            di halaman WhatsApp.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cara menemukan App Domains dan Valid OAuth Redirect URIs</CardTitle>
          <CardDescription>
            Bagian ini biasanya dibutuhkan saat muncul error “Can&apos;t load URL”.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>1) Buka Meta for Developers, lalu pilih aplikasi Meta yang dipakai untuk connect.</p>
          <p>2) Masuk ke menu <strong>Settings &gt; Basic</strong>.</p>
          <p>3) Pada field <strong>App Domains</strong>, isi domain web Anda (tanpa https dan tanpa path).</p>
          <p>4) Masuk ke menu <strong>Facebook Login &gt; Settings</strong>.</p>
          <p>
            5) Pada <strong>Valid OAuth Redirect URIs</strong>, isi URL lengkap:
            <br />
            <code>https://domain-anda/dashboard/whatsapp/onboarding</code>
          </p>
          <p>6) Simpan, tunggu 1-2 menit, lalu coba lagi Generate OAuth URL.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kalau gagal, cek ini</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            - Muncul “App not active”: hubungi admin WABantu, karena ini status
            app Meta (bukan salah input Anda).
          </p>
          <p>
            - Muncul “Can&apos;t load URL”: cek lagi App Domains dan Valid OAuth Redirect URIs
            harus persis sesuai domain yang dipakai saat onboarding.
          </p>
          <p>
            - Login Facebook gagal: coba reset password Facebook lalu ulangi.
          </p>
          <p>
            - Tidak kembali ke WABantu: tutup tab Meta, ulang dari tombol
            Generate OAuth URL.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/dashboard/whatsapp/onboarding">Kembali ke Onboarding</Link>
        </Button>
      </div>
    </>
  );
}
