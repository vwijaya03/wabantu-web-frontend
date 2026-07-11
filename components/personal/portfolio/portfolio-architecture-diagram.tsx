import { wabantuArchitecture, wabantuArchitectureLayers } from "@/lib/portfolio/wabantu";

export function PortfolioArchitectureDiagram() {
  return (
    <section className="portfolio-section px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-[980px]">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          {wabantuArchitecture.title}
        </h2>

        <div className="mt-10 max-w-full">
          <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-6 md:flex-row md:items-center md:justify-between">
            {wabantuArchitectureLayers.map((layer, index) => (
              <div
                key={layer.id}
                className="flex flex-col items-center gap-2 md:flex-1 md:flex-row md:gap-3"
              >
                <div className="w-full rounded-xl border border-neutral-200/80 bg-neutral-50 px-3 py-3 text-center md:min-w-0 md:flex-1">
                  <p className="text-sm font-semibold text-neutral-900">{layer.label}</p>
                  <p className="mt-1 text-[11px] text-neutral-500">{layer.sub}</p>
                </div>
                {index < wabantuArchitectureLayers.length - 1 ? (
                  <span aria-hidden className="text-neutral-300 md:shrink-0">
                    <span className="md:hidden">↓</span>
                    <span className="hidden md:inline">→</span>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <ul className="mt-8 space-y-3">
          {wabantuArchitecture.points.map((point) => (
            <li
              key={point}
              className="flex gap-3 text-lg leading-relaxed text-neutral-700"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
