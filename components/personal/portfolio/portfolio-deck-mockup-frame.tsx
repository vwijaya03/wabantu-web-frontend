import type { ReactNode } from "react";

type PortfolioDeckMockupFrameProps = {
  children: ReactNode;
};

export function PortfolioDeckMockupFrame({ children }: PortfolioDeckMockupFrameProps) {
  return (
    <div className="deck-mockup-stage">
      <div className="deck-mockup-visual">{children}</div>
    </div>
  );
}
