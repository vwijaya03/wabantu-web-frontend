import { Badge } from "@/components/ui/badge";
import { PortfolioDashboardChrome } from "@/components/personal/portfolio/portfolio-dashboard-chrome";
import { PortfolioMessageBubble } from "@/components/personal/portfolio/portfolio-message-bubble";
import { demoConversations, demoMessages } from "@/lib/portfolio/demo-data";

type PortfolioInboxMockupProps = {
  compact?: boolean;
};

export function PortfolioInboxMockup({ compact = false }: PortfolioInboxMockupProps) {
  const selected = demoConversations.find((c) => c.selected) ?? demoConversations[0];

  return (
    <PortfolioDashboardChrome activeNav="inbox" compact={compact}>
      <div className={`grid h-full ${compact ? "grid-cols-1" : "grid-cols-[minmax(0,280px)_1fr]"}`}>
        <div className="border-b border-neutral-200/80 bg-neutral-50/50 sm:border-b-0 sm:border-r">
          <div className="border-b border-neutral-200/80 px-3 py-3">
            <p className="font-semibold text-neutral-900">Inbox</p>
            <p className="text-xs text-neutral-500">3 conversations</p>
          </div>
          <div className="divide-y divide-neutral-200/60">
            {demoConversations.map((convo) => (
              <div
                key={convo.id}
                className={`px-3 py-3 ${
                  convo.selected
                    ? "border-l-2 border-l-emerald-600 bg-white"
                    : "border-l-2 border-l-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">{convo.name}</p>
                    <p className="truncate text-xs text-neutral-500">{convo.preview}</p>
                  </div>
                  {convo.unread > 0 ? (
                    <Badge variant="warning" className="shrink-0 text-[10px]">
                      {convo.unread}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-2">
                  <Badge
                    variant={convo.aiHandled ? "success" : "secondary"}
                    className="text-[10px]"
                  >
                    {convo.aiHandled ? "AI Aktif" : "Handoff"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-[240px] flex-col bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200/80 px-4 py-3">
            <div>
              <p className="font-semibold text-neutral-900">{selected.name}</p>
              <p className="text-xs text-neutral-500">{selected.phone}</p>
            </div>
            <Badge variant="success" className="text-[10px]">
              AI Aktif
            </Badge>
          </div>
          <div className="flex-1 space-y-3 overflow-hidden bg-neutral-50/40 p-4">
            {demoMessages.map((msg) => (
              <PortfolioMessageBubble key={msg.id} message={msg} />
            ))}
          </div>
          <div className="border-t border-neutral-200/80 bg-white px-4 py-3">
            <div className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-400">
              Type a reply or let AI continue...
            </div>
          </div>
        </div>
      </div>
    </PortfolioDashboardChrome>
  );
}
