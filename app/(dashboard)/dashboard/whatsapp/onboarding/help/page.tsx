import Image from "next/image";
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

const OAUTH_REDIRECT_PATH = "/dashboard/whatsapp/onboarding";

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
          <CardTitle>Isian di Meta: domain, privasi, dan penghapusan data</CardTitle>
          <CardDescription>
            Contoh layar di Meta for Developers (Pengaturan dasar aplikasi). Isi
            field yang sama seperti di screenshot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <figure className="overflow-hidden rounded-lg border bg-muted/20">
            <Image
              src="/docs/meta-app-domain-privacy-deletion.png"
              alt="Form Meta: Domain Aplikasi, URL kebijakan privasi, dan penghapusan data pengguna"
              width={1200}
              height={680}
              className="h-auto w-full"
              sizes="(max-width: 768px) 100vw, 48rem"
              priority
            />
            <figcaption className="border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Screenshot contoh — tampilan di dashboard Meta bisa sedikit berbeda
              versi ke versi.
            </figcaption>
          </figure>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <strong>Domain Aplikasi</strong> — isi <strong>hanya hostname</strong>{" "}
              tempat WABantu dibuka (tanpa <code>https://</code>, tanpa path).
              Contoh: <code>app.tokoanda.id</code> atau subdomain ngrok seperti{" "}
              <code>xxxx.ngrok-free.dev</code>. Harus sama dengan domain yang Anda
              pakai saat membuka WABantu di browser.
            </li>
            <li>
              <strong>URL kebijakan privasi</strong> — tautan HTTPS ke halaman Privacy
              Policy (bisa dari admin WABantu, GitHub Pages, atau domain Anda sendiri).
            </li>
            <li>
              <strong>Penghapusan data pengguna</strong> — pilih opsi berbasis URL
              petunjuk, lalu isi tautan HTTPS ke halaman cara menghapus data / data
              deletion (sama seperti yang dipakai untuk review Meta).
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>URL OAuth (Valid OAuth Redirect URIs)</CardTitle>
          <CardDescription>
            WABantu memakai OAuth di <strong>halaman web</strong> (bukan callback
            langsung ke server API). URL pengalihan harus <strong>persis</strong>{" "}
            sama dengan yang Anda daftarkan di Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <figure className="overflow-hidden rounded-lg border bg-muted/20">
            <Image
              src="/docs/meta-oauth-redirect-uri.png"
              alt="Form Meta: Redirect URI OAuth Valid"
              width={1200}
              height={400}
              className="h-auto w-full"
              sizes="(max-width: 768px) 100vw, 48rem"
            />
            <figcaption className="border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Di kolom ini tempel URL lengkap onboarding WABantu (lihat pola di bawah).
            </figcaption>
          </figure>
          <div className="rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed break-all">
            https://&lt;domain-publik-wabantu-anda&gt;{OAUTH_REDIRECT_PATH}
          </div>
          <p className="text-muted-foreground">
            Ganti <code className="rounded bg-muted px-1">&lt;domain-publik-wabantu-anda&gt;</code>{" "}
            dengan domain yang sama seperti saat Anda membuka dashboard (contoh produksi:{" "}
            <code className="rounded bg-muted px-1">app.wabantu.id</code>; contoh lokal
            lewat tunnel: <code className="rounded bg-muted px-1">xxxx.ngrok-free.dev</code>
            ).
          </p>
          <p>
            <strong>Penting:</strong> Jangan memakai URL API NestJS di sini. Setelah
            login Meta, browser akan kembali ke path{" "}
            <code className="rounded bg-muted px-1">{OAUTH_REDIRECT_PATH}</code> di
            frontend; aplikasi lalu menyelesaikan OAuth ke backend secara otomatis.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ringkas: App Domains vs OAuth Redirect</CardTitle>
          <CardDescription>
            Dua field ini sering tertukar — keduanya wajib benar agar tidak error
            &quot;Can&apos;t load URL&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            1) Buka Meta for Developers, pilih aplikasi yang dipakai untuk connect.
          </p>
          <p>
            2) <strong>Settings → Basic</strong> — isi <strong>App Domains</strong>{" "}
            sama seperti <strong>Domain Aplikasi</strong> (hostname saja).
          </p>
          <p>
            3) <strong>Facebook Login → Settings</strong> — pada{" "}
            <strong>Valid OAuth Redirect URIs</strong>, tambahkan satu baris URL
            lengkap:
          </p>
          <p className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs break-all">
            https://domain-anda{OAUTH_REDIRECT_PATH}
          </p>
          <p>4) Simpan, tunggu 1–2 menit, lalu coba lagi Generate OAuth URL di WABantu.</p>
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
