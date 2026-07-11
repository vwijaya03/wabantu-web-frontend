import {
  BookOpen,
  CreditCard,
  MessageSquare,
  Package,
  Route,
  Shield,
} from "lucide-react";

import { wabantuFlowSteps } from "@/lib/portfolio/wabantu";

const stepIcons = [MessageSquare, Route, BookOpen, Package, CreditCard, Shield];

export function PortfolioFlowDiagram() {
  return (
    <section className="portfolio-section border-t border-neutral-100 bg-neutral-50/60 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-[980px]">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Core flow
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-neutral-600">
          From inbound WhatsApp message to verified order — the path the product optimizes for.
        </p>

        <div className="mt-12 hidden lg:block">
          <div className="grid grid-cols-6 gap-3">
            {wabantuFlowSteps.map((step, index) => {
              const Icon = stepIcons[index] ?? MessageSquare;
              return (
                <div key={step.id} className="relative text-center">
                  {index < wabantuFlowSteps.length - 1 ? (
                    <span
                      aria-hidden
                      className="absolute left-[calc(50%+28px)] top-7 h-px w-[calc(100%-56px)] bg-neutral-300"
                    />
                  ) : null}
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
                    <Icon className="h-6 w-6 text-neutral-700" strokeWidth={1.5} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-neutral-900">{step.title}</p>
                </div>
              );
            })}
          </div>
        </div>

        <ol className="mt-8 space-y-4 lg:mt-12">
          {wabantuFlowSteps.map((step, index) => {
            const Icon = stepIcons[index] ?? MessageSquare;
            return (
              <li
                key={step.id}
                className="rounded-2xl border border-neutral-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
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
