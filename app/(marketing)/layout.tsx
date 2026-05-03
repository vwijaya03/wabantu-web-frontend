import Link from "next/link";
import { WabantuLogo } from "@/components/brand/wabantu-logo";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <WabantuLogo textClassName="text-lg" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/#features" className="text-muted-foreground hover:text-foreground">
              Fitur
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              Harga
            </Link>
            <Link href="/#faq" className="text-muted-foreground hover:text-foreground">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Coba Gratis</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {env.appName}. Dibuat untuk UMKM Indonesia.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/pricing" className="hover:text-foreground">Harga</Link>
            <Link href="/privacy" className="hover:text-foreground">Privasi</Link>
            <Link href="/data-deletion" className="hover:text-foreground">Penghapusan data</Link>
            <Link href="/login" className="hover:text-foreground">Masuk</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
