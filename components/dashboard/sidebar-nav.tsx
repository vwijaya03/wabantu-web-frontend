"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
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
