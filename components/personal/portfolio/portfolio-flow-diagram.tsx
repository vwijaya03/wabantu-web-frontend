import { MessageSquare } from "lucide-react";

import { PortfolioIconBox } from "@/components/personal/portfolio/portfolio-icon-box";
import { wabantuFlowIntro, wabantuFlowSteps } from "@/lib/portfolio/wabantu";
import { wabantuFlowIcons } from "@/lib/portfolio/flow-icons";

export function PortfolioFlowDiagram() {
  return (
    <section className="portfolio-section border-t border-neutral-100 bg-neutral-50/60 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-[980px]">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Core flow
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-neutral-600">
          {wabantuFlowIntro}
        </p>

        <div className="mt-12 hidden lg:block">
          <div className="grid grid-cols-6 gap-3">
            {wabantuFlowSteps.map((step, index) => {
              const Icon = wabantuFlowIcons[index] ?? MessageSquare;
              return (
                <div key={step.id} className="relative text-center">
                  {index < wabantuFlowSteps.length - 1 ? (
                    <span
                      aria-hidden
                      className="absolute left-[calc(50%+28px)] top-7 h-px w-[calc(100%-56px)] bg-neutral-300"
                    />
                  ) : null}
                  <PortfolioIconBox Icon={Icon} variant="flow" className="mx-auto" />
                  <p className="mt-3 text-sm font-semibold text-neutral-900">{step.title}</p>
                </div>
              );
            })}
          </div>
        </div>

        <ol className="mt-8 space-y-4 lg:mt-12">
          {wabantuFlowSteps.map((step, index) => {
            const Icon = wabantuFlowIcons[index] ?? MessageSquare;
            return (
              <li
                key={step.id}
                className="rounded-2xl border border-neutral-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <PortfolioIconBox Icon={Icon} variant="flow-step" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-neutral-900">{step.title}</h3>
                    <p className="mt-2 leading-relaxed text-neutral-600">{step.description}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
