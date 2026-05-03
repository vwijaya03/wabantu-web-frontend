import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@wabantu.com";

export const metadata: Metadata = {
  title: "Penghapusan Data Pengguna",
  description: `Cara meminta penghapusan data terkait akun ${env.appName} dan WhatsApp Business.`,
};

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm text-muted-foreground">Terakhir diperbarui: 29 April 2026</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Penghapusan data pengguna</h1>
      <p className="mt-4 text-muted-foreground">
        Halaman ini menjelaskan cara pengguna dapat meminta penghapusan data yang terkait dengan{" "}
        {env.appName}.
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Cara mengajukan penghapusan</h2>
        <p className="text-sm text-muted-foreground">
          Kirim email ke:{" "}
          <a
            className="font-medium text-primary underline underline-offset-4"
            href={`mailto:${SUPPORT_EMAIL}?subject=Data%20Deletion%20Request%20-%20WABantu`}
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-sm font-medium text-foreground">Subjek email:</p>
        <p className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
          Data Deletion Request - WABantu
        </p>
        <p className="text-sm font-medium text-foreground">Sertakan dalam email:</p>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Email akun Anda</li>
          <li>Nama bisnis / tenant</li>
          <li>Nomor WhatsApp yang terhubung ke WABantu (jika ada)</li>
          <li>Detail opsional tentang data yang ingin dihapus</li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Verifikasi</h2>
        <p className="text-sm text-muted-foreground">
          Demi keamanan akun, kami dapat meminta verifikasi tambahan sebelum memproses
          penghapusan.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Waktu pemrosesan</h2>
        <p className="text-sm text-muted-foreground">
          Kami menargetkan penyelesaian dalam 30 hari setelah verifikasi berhasil, kecuali
          diperlukan waktu lebih lama menurut hukum yang berlaku.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Ruang lingkup</h2>
        <p className="text-sm text-muted-foreground">
          Setelah permintaan valid, kami akan menghapus atau menganonimkan data yang tidak lagi
          diperlukan untuk tujuan hukum, keamanan, atau operasional.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Catatan</h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Sistem cadangan dapat menyimpan data sementara hingga masa retensi cadangan normal.</li>
          <li>Beberapa catatan dapat dipertahankan jika diwajibkan oleh hukum yang berlaku.</li>
        </ul>
      </section>

      <p className="mt-12 text-sm text-muted-foreground">
        Lihat juga{" "}
        <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">
          Kebijakan privasi
        </Link>
        .
      </p>
    </div>
  );
}
