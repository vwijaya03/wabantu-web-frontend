import type { Metadata } from "next";

import { PortfolioDeck } from "@/components/personal/portfolio/portfolio-deck";
import { PortfolioExportBar } from "@/components/personal/portfolio/portfolio-export-bar";

import "@/styles/portfolio.css";
import "@/styles/portfolio-deck.css";

export const metadata: Metadata = {
  title: "WABantu · LinkedIn Carousel Export",
  description: "Export WABantu portfolio as a square PDF carousel for LinkedIn.",
  robots: { index: false, follow: false },
};

export default function WabantuDeckPage() {
  return (
    <>
      <PortfolioExportBar variant="deck" />
      <PortfolioDeck />
    </>
  );
}
