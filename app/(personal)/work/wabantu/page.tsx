import type { Metadata } from "next";
import {
  Bot,
  CreditCard,
  MessageSquare,
  Radio,
  ShoppingCart,
  UserRound,
} from "lucide-react";

import { PortfolioArchitectureDiagram } from "@/components/personal/portfolio/portfolio-architecture-diagram";
import { PortfolioFlowDiagram } from "@/components/personal/portfolio/portfolio-flow-diagram";
import { PortfolioHero } from "@/components/personal/portfolio/portfolio-hero";
import { PortfolioTechStack } from "@/components/personal/portfolio/portfolio-tech-stack";
import { portfolioSurfaces } from "@/lib/portfolio/surfaces";
import {
  wabantuAuthor,
  wabantuCapabilities,
  wabantuHero,
  wabantuHighlights,
  wabantuProblem,
  wabantuScopeNote,
  wabantuSolution,
} from "@/lib/portfolio/wabantu";

import "@/styles/portfolio.css";

const capabilityIcons = [Bot, ShoppingCart, UserRound, CreditCard, Radio];

export const metadata: Metadata = {
  title: "WABantu — Pitch Deck",
  description:
    "WABantu pitch deck — WhatsApp AI commerce for Indonesian SMBs. Catalog answers, guided orders, payment proof verification, and multi-tenant architecture.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "WABantu — Pitch Deck",
    description:
      "WhatsApp AI that turns conversations into catalog answers, orders, and verified payments.",
    type: "article",
  },
};

export default function WabantuPortfolioPage() {
  return (
    <div className="portfolio-page font-[family-name:var(--font-portfolio)]">
      <PortfolioHero />

      <section className="portfolio-section border-t border-neutral-100 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-[980px]">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            {wabantuProblem.title}
          </h2>
          <ul className="mt-8 space-y-4">
            {wabantuProblem.points.map((point) => (
              <li
                key={point}
                className="rounded-2xl border border-neutral-200/80 bg-white p-5 text-lg text-neutral-700"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="portfolio-section border-t border-neutral-100 bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-[980px]">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            {wabantuSolution.title}
          </h2>
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-neutral-600">
            {wabantuSolution.body}
          </p>
        </div>
      </section>

      <PortfolioFlowDiagram />

      <section className="portfolio-section px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-[980px]">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            AI capabilities
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {wabantuCapabilities.map((cap, index) => {
              const Icon = capabilityIcons[index] ?? MessageSquare;
              return (
                <div
                  key={cap.title}
                  className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                    <Icon className="h-5 w-5 text-neutral-700" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">{cap.title}</h3>
                  <p className="mt-2 leading-relaxed text-neutral-600">{cap.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="portfolio-section border-t border-neutral-100 bg-neutral-50/60 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-[1080px]">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Product surfaces
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-neutral-600">
            UI mockups recreated from production dashboard patterns — dummy data only, no tenant
            login required.
          </p>
          <div className="mt-12 space-y-16">
            {portfolioSurfaces.map((surface) => {
              const Mockup = surface.Mockup;
              return (
                <article key={surface.id}>
                  <h3 className="text-2xl font-semibold tracking-tight text-neutral-900">
                    {surface.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-neutral-600">{surface.description}</p>
                  <div className="mt-6 max-w-full">
                    <Mockup />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <PortfolioArchitectureDiagram />

      <PortfolioTechStack />

      <section className="portfolio-section border-t border-neutral-100 bg-neutral-50/60 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-[980px]">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Build highlights
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {wabantuHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-neutral-200/80 bg-white p-6"
              >
                <h3 className="text-lg font-semibold text-neutral-900">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-neutral-600">{item.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-12 text-sm leading-relaxed text-neutral-500">{wabantuScopeNote}</p>
        </div>
      </section>

      <section className="portfolio-section border-t border-neutral-100 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-[980px] text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Explore the product
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
            Built by {wabantuAuthor.name} as an independent full-stack product.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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
      </section>
    </div>
  );
}
