"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  CreditCard,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INBOX_UNREAD_QUERY_KEY, inboxApi } from "@/lib/api/inbox";

const groups: Array<{
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
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/team", label: "Team", icon: Users },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { data: unreadSummary } = useQuery({
    queryKey: INBOX_UNREAD_QUERY_KEY,
    queryFn: () => inboxApi.unreadSummary(),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: "always",
    /** SSE (`InboxActivityBridge`) + focus refetch if push did not arrive. */
  });
  const inboxUnread = unreadSummary?.totalUnreadMessages ?? 0;
  const showInboxDot =
    inboxUnread > 0 && !pathname.startsWith("/dashboard/inbox");

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {groups.map((g) => (
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
