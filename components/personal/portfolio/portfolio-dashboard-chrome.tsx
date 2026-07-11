import type { ReactNode } from "react";
import { Inbox, LayoutGrid, Package } from "lucide-react";

type NavItem = {
  id: string;
  label: string;
  icon: typeof Inbox;
  active?: boolean;
};

const navItems: NavItem[] = [
  { id: "inbox", label: "Inbox", icon: Inbox, active: true },
  { id: "orders", label: "Pesanan", icon: Package },
  { id: "catalog", label: "Katalog", icon: LayoutGrid },
];

type PortfolioDashboardChromeProps = {
  children: ReactNode;
  activeNav?: string;
  compact?: boolean;
};

export function PortfolioDashboardChrome({
  children,
  activeNav = "inbox",
  compact = false,
}: PortfolioDashboardChromeProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_20px_60px_-24px_rgba(0,0,0,0.25)] ${
        compact ? "text-[11px]" : "text-sm"
      }`}
    >
      <div className={`flex ${compact ? "min-h-[320px]" : "min-h-[420px]"}`}>
        <aside
          className={`hidden shrink-0 border-r border-neutral-200/80 bg-neutral-50/80 sm:block ${
            compact ? "w-[180px]" : "w-[220px]"
          }`}
        >
          <div className="border-b border-neutral-200/80 px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                W
              </span>
              <span className="font-semibold text-neutral-900">WABantu</span>
            </div>
          </div>
          <nav className="space-y-0.5 p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeNav;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                    active
                      ? "bg-white font-medium text-neutral-900 shadow-sm"
                      : "text-neutral-500"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1 bg-[#fafafa]">{children}</div>
      </div>
    </div>
  );
}
