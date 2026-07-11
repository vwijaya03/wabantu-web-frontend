import { wabantuArchitecture } from "@/lib/portfolio/wabantu";

const layers = [
  { id: "whatsapp", label: "WhatsApp Cloud API", sub: "Inbound webhooks" },
  { id: "encore", label: "Encore services", sub: "Auth, inbox, orders, jobs" },
  { id: "postgres", label: "PostgreSQL", sub: "System + t_* tenant schemas" },
  { id: "redis", label: "Redis", sub: "Sessions, SSE, rate limits" },
  { id: "dashboard", label: "Next.js dashboard", sub: "Vercel" },
];

export function PortfolioArchitectureDiagram() {
  return (
    <section className="portfolio-section px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-[980px]">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          {wabantuArchitecture.title}
        </h2>

        <div className="mt-10 overflow-x-auto">
          <div className="flex min-w-[640px] items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
            {layers.map((layer, index) => (
              <div key={layer.id} className="flex flex-1 items-center gap-3">
                <div className="min-w-[110px] rounded-xl border border-neutral-200/80 bg-neutral-50 px-3 py-3 text-center">
                  <p className="text-sm font-semibold text-neutral-900">{layer.label}</p>
                  <p className="mt-1 text-[11px] text-neutral-500">{layer.sub}</p>
                </div>
                {index < layers.length - 1 ? (
                  <span aria-hidden className="text-neutral-300">
                    →
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
