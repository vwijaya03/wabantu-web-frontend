"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  BookOpen,
  Building2,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Plug,
  Shield,
  Sparkles,
  Upload,
  Users,
  UsersRound,
  Wallet,
  Workflow,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { hasTenantDashboardAccess } from "@/lib/api/auth";
import { INBOX_UNREAD_QUERY_KEY, inboxApi } from "@/lib/api/inbox";
import { tenantContextKey } from "@/lib/auth/tenant-context";
import { cn } from "@/lib/utils";

const tenantNavGroups: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: React.ElementType }>;
}> = [
  {
    label: "Operasional",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
      { href: "/dashboard/contacts", label: "Contacts", icon: UsersRound },
    ],
  },
  {
    label: "AI & Automasi",
    items: [
      { href: "/dashboard/ai-settings", label: "AI Settings", icon: Bot },
      {
        href: "/dashboard/knowledge-base",
        label: "Knowledge Base",
        icon: MessageSquare,
      },
      { href: "/dashboard/whatsapp", label: "WhatsApp", icon: Plug },
    ],
  },
  {
    label: "Bisnis",
    items: [
      { href: "/dashboard/catalog", label: "Katalog", icon: Package },
      { href: "/dashboard/orders", label: "Pesanan", icon: Package },
      { href: "/dashboard/broadcast", label: "Broadcast", icon: Megaphone },
      { href: "/dashboard/import", label: "Import", icon: Upload },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/finance", label: "Finance", icon: Wallet },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/team", label: "Team", icon: Users },
    ],
  },
  {
    label: "Lanjutan",
    items: [
      { href: "/dashboard/branches", label: "Cabang", icon: Building2 },
      { href: "/dashboard/workflow", label: "Workflow", icon: Workflow },
    ],
  },
];

const platformNavGroup = {
  label: "Platform",
  items: [
    { href: "/dashboard/admin", label: "Admin", icon: Shield },
    {
      href: "/dashboard/admin/ai-activity",
      label: "AI Activity",
      icon: Sparkles,
    },
    { href: "/dashboard/docs", label: "Dokumentasi", icon: BookOpen },
  ],
};

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const tenantMode = hasTenantDashboardAccess(user);
  const isSuperAdmin = user?.role === "super_admin";
  const visibleGroups = [
    ...(tenantMode ? tenantNavGroups : []),
    ...(isSuperAdmin ? [platformNavGroup] : []),
  ];

  const tenantKey = tenantContextKey(user);

  const { data: unreadSummary } = useQuery({
    queryKey: [...INBOX_UNREAD_QUERY_KEY, tenantKey],
    queryFn: () => inboxApi.unreadSummary(),
    enabled: tenantMode,
    staleTime: 0,
    refetchOnWindowFocus: tenantMode,
  });
  const inboxUnread = unreadSummary?.totalUnreadMessages ?? 0;
  const showInboxDot =
    inboxUnread > 0 && !pathname.startsWith("/dashboard/inbox");

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {visibleGroups.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {g.label}
          </p>
          <ul className="space-y-1">
            {g.items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.href === "/dashboard/inbox" && showInboxDot ? (
                      <span
                        className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-sidebar"
                        title={`${inboxUnread} pesan belum dibaca`}
                        aria-label={`${inboxUnread} pesan belum dibaca`}
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
