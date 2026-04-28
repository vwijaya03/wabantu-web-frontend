import Link from "next/link";
import { env } from "@/lib/env";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"
          >
            W
          </span>
          {env.appName}
        </Link>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-primary/5 lg:block">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.7_0.16_158/30%),transparent_60%)]"
        />
        <div className="relative flex h-full flex-col items-center justify-center px-12 text-center">
          <div className="max-w-md space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {env.appTagline}
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              Pelanggan dibalas dalam hitungan detik, bukan jam.
            </h2>
            <p className="text-sm text-muted-foreground">
              Setup 5 menit, AI tahu konteks bisnis Anda, dan owner bisa
              ambil alih kapan saja.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
