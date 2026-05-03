import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@wabantu.com";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: `Kebijakan privasi ${env.appName} untuk pengguna dan integrasi WhatsApp Business.`,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm text-muted-foreground">Terakhir diperbarui: 29 April 2026</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Kebijakan Privasi</h1>
      <p className="mt-4 text-muted-foreground">
        {env.appName} (&quot;kami&quot;) menyediakan alat otomatisasi WhatsApp untuk bisnis.
        Kebijakan ini menjelaskan data apa yang kami proses dan bagaimana kami menggunakannya.
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">1. Data yang kami proses</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Data akun (nama, email, peran)</li>
          <li>Profil bisnis (nama bisnis, deskripsi, jam operasional, FAQ)</li>
          <li>Data integrasi WhatsApp (identifikasi channel, metadata koneksi)</li>
          <li>Metadata pesan dan isi pesan yang diperlukan untuk fitur balasan otomatis</li>
          <li>Log teknis untuk keamanan, troubleshooting, dan keandalan layanan</li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">2. Cara kami menggunakan data</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Autentikasi pengguna dan perlindungan akun</li>
          <li>Menyambungkan dan memelihara integrasi WhatsApp</li>
          <li>Menyampaikan dan meningkatkan fitur balasan otomatis</li>
          <li>Dukungan pelanggan dan penanganan insiden</li>
          <li>Kepatuhan terhadap kewajiban hukum</li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">3. Pembagian data</h2>
        <p className="text-sm text-muted-foreground">
          Kami tidak menjual data pribadi. Kami hanya dapat membagikan data kepada penyedia
          layanan yang secara ketat diperlukan untuk menjalankan layanan (misalnya infrastruktur
          cloud, basis data, dan integrasi pesan).
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">4. Keamanan data</h2>
        <p className="text-sm text-muted-foreground">
          Kami menerapkan pengamanan teknis dan organisasi, termasuk kontrol akses dan enkripsi
          untuk bidang sensitif bila relevan.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">5. Retensi data</h2>
        <p className="text-sm text-muted-foreground">
          Kami menyimpan data hanya selama diperlukan untuk menyediakan layanan, memenuhi
          persyaratan hukum, menyelesaikan sengketa, dan menegakkan perjanjian.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">6. Hak Anda</h2>
        <p className="text-sm text-muted-foreground">
          Sesuai yurisdiksi Anda, Anda dapat memiliki hak untuk mengakses, memperbaiki,
          menghapus, atau membatasi pemrosesan data Anda.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">7. Kontak</h2>
        <p className="text-sm text-muted-foreground">
          Untuk pertanyaan atau permintaan terkait privasi, hubungi:{" "}
          <a
            className="font-medium text-primary underline underline-offset-4"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">8. Penghapusan data</h2>
        <p className="text-sm text-muted-foreground">
          Untuk instruksi permintaan penghapusan data, lihat halaman{" "}
          <Link href="/data-deletion" className="font-medium text-primary underline underline-offset-4">
            Penghapusan data pengguna
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
