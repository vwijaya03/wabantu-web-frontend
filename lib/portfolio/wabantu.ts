export type FlowStep = {
  id: string;
  title: string;
  description: string;
};

export type TechStackItem = {
  layer: string;
  items: string[];
};

export type PortfolioHighlight = {
  title: string;
  description: string;
};

export const wabantuHero = {
  eyebrow: "Independent product · Case study",
  title: "WABantu",
  subtitle: "WhatsApp AI that helps Indonesian SMBs answer customers, take orders, and verify payments — without hiring extra staff.",
  ctaProduct: "https://wabantu-web-frontend.vercel.app",
  ctaProductLabel: "View live product",
};

export const wabantuProblem = {
  title: "The problem",
  points: [
    "Small businesses lose sales when WhatsApp messages go unanswered after hours.",
    "Orders are still captured manually — typos, missing details, and slow follow-up are common.",
    "Bank transfer proof arrives as screenshots with little structure for verification.",
  ],
};

export const wabantuSolution = {
  title: "The solution",
  body: "WABantu connects a business WhatsApp number to an AI layer that knows the catalog, guides checkout in chat, and flags payment proof for manual or automated verification. Owners stay in control through a unified inbox and order dashboard.",
};

export const wabantuFlowSteps: FlowStep[] = [
  {
    id: "webhook",
    title: "WhatsApp webhook",
    description: "Inbound messages from Meta Cloud API are verified, normalized, and stored per tenant conversation.",
  },
  {
    id: "routing",
    title: "AI routing",
    description: "The orchestrator decides between greeting, catalog lookup, order flow, order status, or handoff to a human agent.",
  },
  {
    id: "catalog",
    title: "Catalog & knowledge",
    description: "Product and FAQ data ground the model so price, stock, and policy answers stay tied to real business data.",
  },
  {
    id: "order",
    title: "Order state machine",
    description: "A guided checkout collects product, quantity, recipient details, and address before creating a draft order.",
  },
  {
    id: "payment",
    title: "Payment proof",
    description: "Transfer screenshots can be linked to orders; vision OCR supports manual review or tenant-configured auto-verify.",
  },
  {
    id: "stock",
    title: "Stock guard",
    description: "Available quantity is checked per warehouse before the AI commits quantities customers cannot fulfill.",
  },
];

export const wabantuCapabilities = [
  {
    title: "24/7 auto-reply",
    description: "Answers common questions from business profile and knowledge base when staff are offline.",
  },
  {
    title: "Structured order flow",
    description: "Multi-step checkout in chat with validation against catalog items, variants, and required shipping fields.",
  },
  {
    title: "Inbox with human handoff",
    description: "Owners and staff can pause AI, reply manually, and resume automation on the same thread.",
  },
  {
    title: "Payment verification",
    description: "Manual approve/reject in the dashboard, or auto-verify when OCR confidence and bank details match KB rules.",
  },
  {
    title: "Real-time inbox",
    description: "Server-sent events push new messages to the dashboard without polling.",
  },
];

export const wabantuArchitecture = {
  title: "Architecture",
  points: [
    "Multi-tenant isolation with per-tenant PostgreSQL schemas (t_<slug>).",
    "Encore.go services for auth, webhook, AI jobs, orders, and inbox APIs.",
    "Redis for sessions, rate limits, and inbox live updates.",
    "Pub/Sub for async AI work, media persistence, and background imports.",
    "Next.js dashboard on Vercel; API on Encore Cloud.",
  ],
};

export const wabantuTechStack: TechStackItem[] = [
  { layer: "Backend", items: ["Go 1.26", "Encore.dev", "PostgreSQL"] },
  { layer: "Frontend", items: ["Next.js App Router", "React 19", "TanStack Query", "Shadcn/ui"] },
  { layer: "AI", items: ["Anthropic Claude", "Vision OCR", "Order orchestration"] },
  { layer: "Messaging", items: ["Meta WhatsApp Cloud API", "Webhooks", "SSE inbox"] },
  { layer: "Infra", items: ["Redis", "Encore Pub/Sub", "Vercel", "Encore Cloud"] },
];

export const wabantuHighlights: PortfolioHighlight[] = [
  {
    title: "Tenant-safe by design",
    description: "Every business runs in an isolated schema — conversations, orders, and catalog data do not cross tenants.",
  },
  {
    title: "Production-minded AI",
    description: "Routing, guardrails, and stock checks prevent the model from inventing products or over-promising inventory.",
  },
  {
    title: "Owner stays in control",
    description: "AI can be paused per conversation; payment proof still goes through explicit business rules.",
  },
];

export const wabantuScopeNote =
  "Events, finance, and extended inventory modules exist in the same codebase as personal extensions. The core product story above focuses on WhatsApp commerce: chat, AI, catalog, orders, and payment proof.";

export const wabantuAuthor = {
  name: "Viko Wijaya",
  resumeHref: "/resume",
};
