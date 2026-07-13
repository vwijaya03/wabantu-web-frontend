import {
  Bot,
  Cloud,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Radio,
  ShoppingCart,
  Sparkles,
  UserRound,
} from "lucide-react";

import { PortfolioDeckMockupFrame } from "@/components/personal/portfolio/portfolio-deck-mockup-frame";
import { PortfolioDeckSlide } from "@/components/personal/portfolio/portfolio-deck-slide";
import { wabantuFlowIcons } from "@/lib/portfolio/flow-icons";
import { portfolioSurfaces } from "@/lib/portfolio/surfaces";
import {
  wabantuArchitecture,
  wabantuArchitectureLayers,
  wabantuAuthor,
  wabantuCapabilities,
  wabantuDeck,
  wabantuExplore,
  wabantuFlowIntro,
  wabantuFlowSteps,
  wabantuHero,
  wabantuHighlights,
  wabantuProblem,
  wabantuScopeNote,
  wabantuSolution,
  wabantuSolutionPillars,
  wabantuSurfacesIntro,
  wabantuTechStack,
  wabantuTechStackIntro,
} from "@/lib/portfolio/wabantu";

const capabilityIcons = [Bot, ShoppingCart, UserRound, CreditCard, Radio];

const solutionPillarIcons = [MessageSquare, Sparkles, LayoutDashboard];

const techStackDeckConfig: Record<
  string,
  { type: "text"; label: string } | { type: "icon"; Icon: typeof Sparkles }
> = {
  Backend: { type: "text", label: "Go" },
  Frontend: { type: "text", label: "NX" },
  AI: { type: "icon", Icon: Sparkles },
  Messaging: { type: "text", label: "WA" },
  Infra: { type: "icon", Icon: Cloud },
};

function DeckMockupHeader({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <div className="deck-mockup-header">
      <p className="deck-eyebrow">Product surfaces</p>
      <h2 className="deck-mockup-title">{title}</h2>
      <p className="deck-mockup-caption">{caption}</p>
    </div>
  );
}

function DeckFlowSteps({ startIndex, count }: { startIndex: number; count: number }) {
  const steps = wabantuFlowSteps.slice(startIndex, startIndex + count);

  return (
    <div className="deck-flow-steps">
      {steps.map((step, offset) => {
        const index = startIndex + offset;
        const Icon = wabantuFlowIcons[index] ?? MessageSquare;
        return (
          <div key={step.id} className="deck-flow-step">
            <div className="deck-flow-step-icon">
              <Icon className="deck-flow-step-glyph" strokeWidth={1.5} />
            </div>
            <div className="deck-flow-step-copy">
              <p className="deck-flow-step-kicker">Step {index + 1}</p>
              <p className="deck-flow-step-title">{step.title}</p>
              <p className="deck-flow-step-body">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PortfolioDeck() {
  return (
    <div className="deck-document portfolio-page pb-16 pt-6">
      <PortfolioDeckSlide variant="cover">
        <div className="deck-cover-brand">
          <span className="deck-cover-mark">W</span>
          <p className="deck-eyebrow">{wabantuHero.eyebrow}</p>
        </div>
        <h1 className="deck-cover-title">{wabantuHero.title}</h1>
        <p className="deck-cover-subtitle">{wabantuHero.subtitle}</p>
        <p className="deck-cover-footer">
          {wabantuDeck.learningLabel} · {wabantuAuthor.name}
        </p>
      </PortfolioDeckSlide>

      <PortfolioDeckSlide variant="content">
        <h2 className="deck-title deck-title--section">{wabantuProblem.title}</h2>
        <div className="deck-list">
          {wabantuProblem.points.map((point, index) => (
            <div key={point} className="deck-list-item">
              <span className="deck-list-index">{index + 1}</span>
              <p>{point}</p>
            </div>
          ))}
        </div>
      </PortfolioDeckSlide>

      <PortfolioDeckSlide variant="content">
        <h2 className="deck-title deck-title--section">{wabantuSolution.title}</h2>
        <p className="deck-subtitle deck-subtitle--solution">{wabantuSolution.body}</p>
        <div className="deck-solution-pillars">
          {wabantuSolutionPillars.map((pillar, index) => {
            const Icon = solutionPillarIcons[index] ?? MessageSquare;
            return (
              <div key={pillar.title} className="deck-card deck-card--icon deck-card--compact">
                <div className="deck-card-icon">
                  <Icon className="deck-card-icon-glyph" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="deck-card-title">{pillar.title}</p>
                  <p className="deck-card-body">{pillar.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </PortfolioDeckSlide>

      <PortfolioDeckSlide variant="content">
        <p className="deck-eyebrow">Core flow</p>
        <h2 className="deck-title">Message to verified order</h2>
        <p className="deck-subtitle deck-subtitle--flow">{wabantuFlowIntro}</p>
        <div className="deck-flow-grid">
          {wabantuFlowSteps.map((step, index) => {
            const Icon = wabantuFlowIcons[index] ?? MessageSquare;
            return (
              <div key={step.id} className="deck-flow-cell">
                {index < wabantuFlowSteps.length - 1 ? (
                  <span aria-hidden className="deck-flow-connector" />
                ) : null}
                <div className="deck-flow-icon-box">
                  <Icon className="deck-flow-icon" strokeWidth={1.5} />
                </div>
                <p className="deck-flow-label">{step.title}</p>
              </div>
            );
          })}
        </div>
      </PortfolioDeckSlide>

      <PortfolioDeckSlide variant="content">
        <p className="deck-eyebrow">Core flow</p>
        <h2 className="deck-title">How each step works</h2>
        <DeckFlowSteps startIndex={0} count={3} />
      </PortfolioDeckSlide>

      <PortfolioDeckSlide variant="content">
        <p className="deck-eyebrow">Core flow</p>
        <h2 className="deck-title">How each step works</h2>
        <DeckFlowSteps startIndex={3} count={3} />
      </PortfolioDeckSlide>

      <PortfolioDeckSlide variant="content">
        <p className="deck-eyebrow">AI capabilities</p>
        <h2 className="deck-title">AI capabilities</h2>
        <div className="deck-grid-2 deck-grid-2--capabilities">
          {wabantuCapabilities.map((cap, index) => {
            const Icon = capabilityIcons[index] ?? Bot;
            return (
              <div key={cap.title} className="deck-card deck-card--icon deck-card--compact">
                <div className="deck-card-icon">
                  <Icon className="deck-card-icon-glyph" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="deck-card-title">{cap.title}</p>
                  <p className="deck-card-body">{cap.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </PortfolioDeckSlide>

      <PortfolioDeckSlide variant="content">
        <p className="deck-eyebrow">Product surfaces</p>
        <h2 className="deck-title">Product surfaces</h2>
        <p className="deck-subtitle">{wabantuSurfacesIntro}</p>
        <div className="deck-surface-list">
          {portfolioSurfaces.map((surface) => (
            <div key={surface.id} className="deck-surface-item">
              <p className="deck-surface-title">{surface.title}</p>
              <p className="deck-surface-body">{surface.description}</p>
            </div>
          ))}
        </div>
      </PortfolioDeckSlide>

      {portfolioSurfaces.map((surface) => {
        const Mockup = surface.Mockup;
        return (
          <PortfolioDeckSlide key={surface.id} variant="mockup">
            <DeckMockupHeader title={surface.title} caption={surface.description} />
            <PortfolioDeckMockupFrame>
              <Mockup deck />
            </PortfolioDeckMockupFrame>
          </PortfolioDeckSlide>
        );
      })}

      <PortfolioDeckSlide variant="diagram">
        <div className="deck-mockup-header">
          <p className="deck-eyebrow">{wabantuArchitecture.title}</p>
          <h2 className="deck-title">{wabantuArchitecture.title}</h2>
        </div>
        <div className="deck-arch-grid">
          {wabantuArchitectureLayers.map((layer, index) => (
            <div key={layer.id} className="deck-arch-cell">
              {index < wabantuArchitectureLayers.length - 1 ? (
                <span aria-hidden className="deck-arch-connector" />
              ) : null}
              <div className="deck-arch-node">
                <p className="deck-arch-node-title">{layer.label}</p>
                <p className="deck-arch-node-sub">{layer.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <ul className="deck-arch-points deck-arch-points--compact">
          {wabantuArchitecture.points.map((point) => (
            <li key={point} className="deck-arch-point">
              {point}
            </li>
          ))}
        </ul>
      </PortfolioDeckSlide>

      <PortfolioDeckSlide variant="content">
        <p className="deck-eyebrow">Tech stack</p>
        <h2 className="deck-title">Tech stack</h2>
        <p className="deck-subtitle">{wabantuTechStackIntro}</p>
        <div className="deck-tech-grid">
          {wabantuTechStack.map((item) => {
            const config = techStackDeckConfig[item.layer] ?? {
              type: "text" as const,
              label: item.layer.slice(0, 2),
            };
            return (
              <div key={item.layer} className="deck-card deck-card--tech">
                <div className="deck-tech-head">
                  <span className="deck-tech-badge">
                    {config.type === "icon" ? (
                      <config.Icon className="deck-tech-badge-icon" strokeWidth={1.75} />
                    ) : (
                      config.label
                    )}
                  </span>
                  <p className="deck-tech-layer">{item.layer}</p>
                </div>
                <ul className="deck-tech-list">
                  {item.items.map((tech) => (
                    <li key={tech}>{tech}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </PortfolioDeckSlide>

      <PortfolioDeckSlide variant="content">
        <p className="deck-eyebrow">Build highlights</p>
        <h2 className="deck-title">Build highlights</h2>
        <div className="deck-grid-3">
          {wabantuHighlights.map((item) => (
            <div key={item.title} className="deck-card">
              <p className="deck-card-title">{item.title}</p>
              <p className="deck-card-body">{item.description}</p>
            </div>
          ))}
        </div>
        <p className="deck-scope-note">{wabantuScopeNote}</p>
      </PortfolioDeckSlide>

      <PortfolioDeckSlide variant="cover">
        <p className="deck-eyebrow">Explore</p>
        <h2 className="deck-cover-title deck-cover-title--small">{wabantuExplore.title}</h2>
        <p className="deck-subtitle deck-subtitle--center">{wabantuExplore.subtitle}</p>
        <div className="deck-cta-box">
          <div className="deck-cta-row">
            <p className="deck-cta-label">{wabantuHero.ctaProductLabel}</p>
            <p className="deck-cta-url">{wabantuHero.ctaProduct}</p>
          </div>
          <div className="deck-cta-row">
            <p className="deck-cta-label">Full portfolio page</p>
            <p className="deck-cta-url">{wabantuDeck.portfolioUrl}</p>
          </div>
        </div>
        <p className="deck-cta-note">
          {wabantuDeck.learningLabel} · {wabantuAuthor.name}
        </p>
      </PortfolioDeckSlide>
    </div>
  );
}
