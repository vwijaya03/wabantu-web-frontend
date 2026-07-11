"use client";

import Link from "next/link";

type PortfolioExportBarProps = {
  variant?: "portfolio" | "deck";
};

export function PortfolioExportBar({ variant = "portfolio" }: PortfolioExportBarProps) {
  const handlePrint = () => {
    window.print();
  };

  if (variant === "deck") {
    return (
      <div className="deck-export-bar sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/work/wabantu"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            ← Back to portfolio
          </Link>
          <p className="text-sm text-neutral-500">
            12 square slides · Save as PDF for LinkedIn carousel
          </p>
          <button
            type="button"
            onClick={handlePrint}
            className="ml-auto inline-flex rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Save as PDF
          </button>
        </div>
        <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-2 text-center text-xs text-neutral-500 sm:px-6">
          In the print dialog: choose <strong>Save as PDF</strong>, turn off headers/footers, then
          upload the PDF to LinkedIn as a document post.
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-export-bar mx-auto max-w-[1080px] px-4 pt-4 print:hidden sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50/80 px-4 py-3">
        <p className="text-sm text-neutral-600">Share on LinkedIn as a swipeable carousel</p>
        <Link
          href="/work/wabantu/deck"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Export carousel PDF
        </Link>
      </div>
    </div>
  );
}
