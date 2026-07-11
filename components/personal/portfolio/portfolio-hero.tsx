import { PortfolioInboxMockup } from "@/components/personal/portfolio/portfolio-inbox-mockup";
import { wabantuHero } from "@/lib/portfolio/wabantu";

export function PortfolioHero() {
  return (
    <section className="portfolio-section px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div className="mx-auto grid max-w-[1080px] items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-neutral-500">
            {wabantuHero.eyebrow}
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-neutral-900 sm:text-6xl">
            {wabantuHero.title}
          </h1>
          <p className="mt-6 text-xl leading-relaxed text-neutral-600 sm:text-2xl">
            {wabantuHero.subtitle}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href={wabantuHero.ctaProduct}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              {wabantuHero.ctaProductLabel}
            </a>
          </div>
        </div>

        <div className="portfolio-hero-visual">
          <PortfolioInboxMockup compact />
        </div>
      </div>
    </section>
  );
}
