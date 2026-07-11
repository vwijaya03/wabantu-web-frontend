import { Cloud, Sparkles } from "lucide-react";

import { wabantuTechStack, wabantuTechStackIntro } from "@/lib/portfolio/wabantu";

const layerIcons: Record<
  string,
  { type: "text"; label: string } | { type: "icon"; Icon: typeof Sparkles }
> = {
  Backend: { type: "text", label: "Go" },
  Frontend: { type: "text", label: "NX" },
  AI: { type: "icon", Icon: Sparkles },
  Messaging: { type: "text", label: "WA" },
  Infra: { type: "icon", Icon: Cloud },
};

export function PortfolioTechStack() {
  return (
    <section className="portfolio-section px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-[980px]">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Tech stack
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-neutral-600">
          {wabantuTechStackIntro}
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wabantuTechStack.map((item) => {
            const config = layerIcons[item.layer] ?? {
              type: "text" as const,
              label: item.layer.slice(0, 2),
            };
            return (
              <div
                key={item.layer}
                className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200/80 bg-neutral-100 text-xs font-bold text-neutral-900">
                    {config.type === "icon" ? (
                      <config.Icon className="h-5 w-5 text-neutral-900" strokeWidth={1.75} />
                    ) : (
                      config.label
                    )}
                  </span>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                    {item.layer}
                  </h3>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {item.items.map((tech) => (
                    <li key={tech} className="text-base font-medium text-neutral-900">
                      {tech}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
