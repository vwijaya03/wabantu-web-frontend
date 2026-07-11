import type { DemoMessage } from "@/lib/portfolio/demo-data";

type PortfolioMessageBubbleProps = {
  message: DemoMessage;
};

export function PortfolioMessageBubble({ message }: PortfolioMessageBubbleProps) {
  const isOut = message.direction === "out";

  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
          isOut
            ? "rounded-br-md bg-emerald-600 text-white"
            : "rounded-bl-md border border-neutral-200/80 bg-white text-neutral-800 shadow-sm"
        }`}
      >
        {message.type === "image" ? (
          <div className="space-y-2">
            <div className="h-24 w-36 rounded-lg bg-gradient-to-br from-neutral-200 to-neutral-300" />
            {message.body ? <p>{message.body}</p> : null}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message.body}</p>
        )}
        {isOut && message.author === "ai" ? (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-emerald-100">
            AI reply
          </p>
        ) : null}
      </div>
    </div>
  );
}
