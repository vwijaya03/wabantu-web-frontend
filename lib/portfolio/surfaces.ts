import type { ComponentType } from "react";

import { PortfolioCatalogMockup } from "@/components/personal/portfolio/portfolio-catalog-mockup";
import { PortfolioInboxMockup } from "@/components/personal/portfolio/portfolio-inbox-mockup";
import { PortfolioOrdersMockup } from "@/components/personal/portfolio/portfolio-orders-mockup";
import { PortfolioPaymentMockup } from "@/components/personal/portfolio/portfolio-payment-mockup";

export type PortfolioSurfaceConfig = {
  id: string;
  title: string;
  description: string;
  Mockup: ComponentType<{ deck?: boolean }>;
};

export const portfolioSurfaces: PortfolioSurfaceConfig[] = [
  {
    id: "inbox",
    title: "Inbox",
    description:
      "Unified WhatsApp threads with AI status, conversation list, and staff handoff controls.",
    Mockup: PortfolioInboxMockup,
  },
  {
    id: "orders",
    title: "Orders",
    description:
      "Draft and processing orders created from chat, with payment status and fulfillment details.",
    Mockup: PortfolioOrdersMockup,
  },
  {
    id: "catalog",
    title: "Catalog",
    description:
      "Product form and list view, the data source for accurate quotes and order matching in chat.",
    Mockup: PortfolioCatalogMockup,
  },
  {
    id: "payment",
    title: "Payment proof",
    description:
      "Transfer screenshot review with OCR metadata, verify/reject actions, and order linkage.",
    Mockup: PortfolioPaymentMockup,
  },
];
