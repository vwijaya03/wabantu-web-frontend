import type { AITriageIncident, AITriageTurnEvidence } from "@/lib/api/ai-triage";

function asTurnEvidence(raw: unknown): AITriageTurnEvidence | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as AITriageTurnEvidence;
    } catch {
      return undefined;
    }
  }
  if (typeof raw === "object") {
    return raw as AITriageTurnEvidence;
  }
  return undefined;
}

export function IncidentTurnPair({ incident }: { incident: AITriageIncident }) {
  const ev = asTurnEvidence(incident.evidence);
  if (!ev?.userText && !ev?.finalText) {
    return (
      <p className="text-sm text-muted-foreground">
        Evidence turn belum ada pada insiden ini.
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
      <p>
        <span className="text-muted-foreground">Pesan masuk: </span>
        <span className="whitespace-pre-wrap break-words">{ev.userText || "—"}</span>
      </p>
      <p>
        <span className="text-muted-foreground">Balasan AI: </span>
        <span className="whitespace-pre-wrap break-words">{ev.finalText || "—"}</span>
      </p>
      {ev.path ? (
        <p className="text-xs text-muted-foreground">Path {ev.path}</p>
      ) : null}
    </div>
  );
}

export function incidentUserText(incident: AITriageIncident): string {
  return asTurnEvidence(incident.evidence)?.userText?.trim() || "";
}
