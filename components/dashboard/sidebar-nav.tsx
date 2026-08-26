"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { hasTenantDashboardAccess } from "@/lib/api/auth";
import { INBOX_UNREAD_QUERY_KEY, inboxApi } from "@/lib/api/inbox";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { tenantContextKey } from "@/lib/auth/tenant-context";
import {
  isNavLinkActive,
  PLATFORM_NAV_SECTION,
  sectionLinks,
  sectionMatchesPath,
  TENANT_NAV_SECTIONS,
  type NavLink,
  type NavSection,
} from "@/lib/dashboard/nav-config";
import { filterNavSectionsByModules } from "@/lib/dashboard/impersonation-modules";
import { cn } from "@/lib/utils";

function NavItemLink({
  item,
  active,
  showInboxDot,
  inboxUnread,
  onNavigate,
}: {
  item: NavLink;
  active: boolean;
  showInboxDot: boolean;
  inboxUnread: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={() => onNavigate?.()}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.href === "/dashboard/inbox" && showInboxDot ? (
        <span
          className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-sidebar"
          title={`${inboxUnread} pesan belum dibaca`}
          aria-label={`${inboxUnread} pesan belum dibaca`}
        />
      ) : null}
    </Link>
  );
}

function CollapsibleNavSection({
  section,
  pathname,
  inboxUnread,
  showInboxDot,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  inboxUnread: number;
  showInboxDot: boolean;
  onNavigate?: () => void;
}) {
  const routeActive = sectionMatchesPath(section, pathname);
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? (section.collapsible ? routeActive : true);

  const content = (
    <ul className="space-y-0.5">
      {section.items
        ? section.items.map((item) => (
            <li key={item.href}>
              <NavItemLink
                item={item}
                active={isNavLinkActive(item.href, pathname)}
                showInboxDot={showInboxDot}
                inboxUnread={inboxUnread}
                onNavigate={onNavigate}
              />
            </li>
          ))
        : null}
      {section.clusters?.map((cluster) => (
        <li key={cluster.label} className="pt-1 first:pt-0">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {cluster.label}
          </p>
          <ul className="space-y-0.5">
            {cluster.items.map((item) => (
              <li key={item.href}>
                <NavItemLink
                  item={item}
                  active={isNavLinkActive(item.href, pathname)}
                  showInboxDot={showInboxDot}
                  inboxUnread={inboxUnread}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );

  if (!section.collapsible) {
    return (
      <div>
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.label}
        </p>
        {content}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-sidebar-border/50 bg-sidebar-accent/10">
      <button
        type="button"
        onClick={() => setManualOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider transition-colors",
          routeActive ? "text-sidebar-foreground" : "text-muted-foreground hover:text-sidebar-foreground",
        )}
        aria-expanded={open}
      >
        <span>{section.label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div className="px-1 pb-2">{content}</div> : null}
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const tenantMode = hasTenantDashboardAccess(user);
  const isSuperAdmin = user?.role === "super_admin";

  const sections = useMemo(() => {
    let tenantSections = tenantMode ? [...TENANT_NAV_SECTIONS] : [];

    if (tenantMode && user?.role !== "owner") {
      tenantSections = tenantSections.map((section) => {
        if (section.id !== "org" || !section.items) return section;
        return {
          ...section,
          items: section.items.filter(
            (item) => item.href !== "/dashboard/access-requests",
          ),
        };
      });
    }

    if (
      user?.impersonation?.active &&
      user.impersonation.modules &&
      user.impersonation.modules.length > 0
    ) {
      tenantSections = filterNavSectionsByModules(
        tenantSections,
        user.impersonation.modules,
      );
    }

    const out = [...tenantSections];
    if (isSuperAdmin) out.push(PLATFORM_NAV_SECTION);
    return out;
  }, [tenantMode, isSuperAdmin, user]);

  const tenantKey = tenantContextKey(user);
  const tenantQueriesEnabled = useTenantQueryEnabled();

  const { data: unreadSummary } = useQuery({
    queryKey: [...INBOX_UNREAD_QUERY_KEY, tenantKey],
    queryFn: () => inboxApi.unreadSummary(),
    enabled: tenantMode && tenantQueriesEnabled,
    staleTime: 0,
    refetchOnWindowFocus: tenantMode,
  });
  const inboxUnread = unreadSummary?.totalUnreadMessages ?? 0;
  const showInboxDot = inboxUnread > 0 && !pathname.startsWith("/dashboard/inbox");

  return (
    <nav className="flex flex-col gap-3 px-3 py-4">
      {sections.map((section) => (
        <CollapsibleNavSection
          key={section.id}
          section={section}
          pathname={pathname}
          inboxUnread={inboxUnread}
          showInboxDot={showInboxDot}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

// Re-export for tests or active-route helpers elsewhere
export { sectionLinks, isNavLinkActive };
