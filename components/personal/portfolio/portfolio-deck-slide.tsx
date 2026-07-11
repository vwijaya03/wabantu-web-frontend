import type { ReactNode } from "react";

type PortfolioDeckSlideProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "mockup" | "cover" | "content" | "diagram";
};

export function PortfolioDeckSlide({
  children,
  className,
  variant = "default",
}: PortfolioDeckSlideProps) {
  return (
    <section
      className={`deck-slide deck-slide--${variant} ${className ?? ""}`.trim()}
    >
      <div className="deck-slide-inner">{children}</div>
    </section>
  );
}
