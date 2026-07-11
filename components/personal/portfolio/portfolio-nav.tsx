import { wabantuHero } from "@/lib/portfolio/wabantu";

export function PortfolioNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a
          href="#"
          className="text-sm font-semibold tracking-tight text-neutral-900 hover:text-neutral-600"
        >
          WABantu
        </a>

        <a
          href={wabantuHero.ctaProduct}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          {wabantuHero.ctaProductLabel}
        </a>
      </div>
    </header>
  );
}
