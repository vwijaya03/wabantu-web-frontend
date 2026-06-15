import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  CalendarHeart,
  ClipboardList,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  Layers,
  GraduationCap,
  Megaphone,
  MessageSquare,
  Package,
  Plug,
  Receipt,
  Scale,
  ScrollText,
  Settings2,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Tags,
  TrendingUp,
  Undo2,
  Upload,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
  Wand2,
  Workflow,
  Wrench,
  ArrowLeftRight,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Sub-heading inside a collapsible section (visual grouping, not nested accordion). */
export type NavCluster = {
  label: string;
  items: NavLink[];
};

export type NavSection = {
  id: string;
  label: string;
  /** Collapsed by default unless route matches or user expands. */
  collapsible?: boolean;
  items?: NavLink[];
  clusters?: NavCluster[];
};

export const TENANT_NAV_SECTIONS: NavSection[] = [
  {
    id: "main",
    label: "Utama",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
      { href: "/dashboard/contacts", label: "Contacts", icon: UsersRound },
    ],
  },
  {
    id: "sales",
    label: "Penjualan",
    collapsible: true,
    clusters: [
      {
        label: "Produk & pesanan",
        items: [
          { href: "/dashboard/catalog", label: "Katalog", icon: Package },
          { href: "/dashboard/catalog/price-types", label: "Tipe Harga", icon: Tags },
          { href: "/dashboard/orders", label: "Pesanan", icon: ShoppingCart },
        ],
      },
      {
        label: "Promosi",
        items: [{ href: "/dashboard/broadcast", label: "Broadcast", icon: Megaphone }],
      },
    ],
  },
  {
    id: "inventory",
    label: "Persediaan",
    collapsible: true,
    clusters: [
      {
        label: "Ringkasan",
        items: [
          { href: "/dashboard/inventory", label: "Stok", icon: Boxes },
          { href: "/dashboard/inventory/guide", label: "Panduan Pemula", icon: GraduationCap },
          { href: "/dashboard/inventory/movements", label: "Pergerakan", icon: ScrollText },
          { href: "/dashboard/inventory/reports", label: "Laporan", icon: BarChart3 },
        ],
      },
      {
        label: "Operasi stok",
        items: [
          { href: "/dashboard/inventory/adjustments", label: "Penyesuaian", icon: Scale },
          { href: "/dashboard/inventory/transfers", label: "Transfer", icon: ArrowLeftRight },
          { href: "/dashboard/inventory/opening-balance", label: "Saldo Awal", icon: Layers },
          { href: "/dashboard/inventory/revaluations", label: "Revaluasi HPP", icon: TrendingUp },
        ],
      },
      {
        label: "Pembelian",
        items: [
          { href: "/dashboard/inventory/purchase-orders", label: "Pembelian (PO)", icon: ClipboardList },
          { href: "/dashboard/inventory/bills", label: "Penerimaan", icon: FileText },
        ],
      },
      {
        label: "Penjualan & retur",
        items: [
          { href: "/dashboard/inventory/invoices", label: "Faktur", icon: Receipt },
          { href: "/dashboard/inventory/sales-returns", label: "Retur", icon: Undo2 },
        ],
      },
      {
        label: "Data & pengaturan",
        items: [
          { href: "/dashboard/inventory/warehouses", label: "Gudang", icon: Warehouse },
          { href: "/dashboard/inventory/items", label: "Konfigurasi Item", icon: Settings2 },
          { href: "/dashboard/inventory/setup", label: "Setup HPP", icon: Wand2 },
          { href: "/dashboard/inventory/settings", label: "Pengaturan", icon: SlidersHorizontal },
          { href: "/dashboard/inventory/maintenance", label: "Pemeliharaan", icon: Wrench },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Keuangan",
    collapsible: true,
    items: [
      { href: "/dashboard/finance", label: "Finance", icon: Wallet },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
    ],
  },
  {
    id: "ai",
    label: "AI & Channel",
    collapsible: true,
    items: [
      { href: "/dashboard/ai-settings", label: "AI Settings", icon: Bot },
      { href: "/dashboard/knowledge-base", label: "Knowledge Base", icon: MessageSquare },
      { href: "/dashboard/whatsapp", label: "WhatsApp", icon: Plug },
    ],
  },
  {
    id: "org",
    label: "Organisasi",
    collapsible: true,
    items: [
      { href: "/dashboard/team", label: "Team", icon: Users },
      { href: "/dashboard/import", label: "Import", icon: Upload },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/events", label: "Acara & Terapi", icon: CalendarHeart },
    ],
  },
  {
    id: "advanced",
    label: "Lanjutan",
    collapsible: true,
    items: [
      { href: "/dashboard/branches", label: "Cabang", icon: Building2 },
      { href: "/dashboard/workflow", label: "Workflow", icon: Workflow },
    ],
  },
];

export const PLATFORM_NAV_SECTION: NavSection = {
  id: "platform",
  label: "Platform",
  items: [
    { href: "/dashboard/admin", label: "Admin", icon: Shield },
    { href: "/dashboard/admin/ai-activity", label: "AI Activity", icon: Sparkles },
    { href: "/dashboard/docs", label: "Dokumentasi", icon: BookOpen },
  ],
};

/** Flatten all links in a section (for active-route detection). */
export function sectionLinks(section: NavSection): NavLink[] {
  if (section.items) return section.items;
  if (!section.clusters) return [];
  return section.clusters.flatMap((c) => c.items);
}

export function sectionMatchesPath(section: NavSection, pathname: string): boolean {
  return sectionLinks(section).some((item) => isNavLinkActive(item.href, pathname));
}

const EXACT_MATCH_HREFS = new Set([
  "/dashboard",
  "/dashboard/inventory",
  "/dashboard/catalog",
  "/dashboard/finance",
]);

export function isNavLinkActive(href: string, pathname: string): boolean {
  if (EXACT_MATCH_HREFS.has(href)) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
