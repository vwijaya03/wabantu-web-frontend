import type { ReactNode } from "react";

import { PortfolioNav } from "@/components/personal/portfolio/portfolio-nav";

export default function WabantuPortfolioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PortfolioNav />
      {children}
    </>
  );
}
