import { api } from "./client";
import { getCodesimSessionIds, getOrCreateClientToken, trackCodesimSession } from "@/lib/codesim/session-history";

export interface CodesimBlueprint {
  id: string;
  slug: string;
  title: string;
  config: {
        sections: Array<{
      type: string;
      count: number;
      timeLimitMinutes: number;
      tags?: string[];
      difficulty?: string;
      componentFamily?: string;
    }>;
    totalTimeLimitMinutes: number;
    proctoring: {
      maxBlurEvents: number;
      warnOnPaste: boolean;
      blockPasteInEditor: boolean;
    };
  };
  isPublic: boolean;
}

export interface CodesimMCQChoice {
  id: string;
  text: string;
}

export interface CodesimExamQuestion {
  index: number;
  type: "mcq" | "react_build" | "react_debug";
  sourceId: string;
  points: number;
  learningObjective?: string;
  mcq?: { question: string; codeSnippet?: string; choices: CodesimMCQChoice[] };
  build?: {
    title: string;
    specMarkdown: string;
    starterCode: string;
    testCases?: unknown;
  };
  debug?: {
    title: string;
    brokenCode: string;
    bugDescription?: string;
    testCases?: unknown;
  };
}

export interface CodesimTopicPreset {
  id: string;
  label: string;
  description: string;
  tags: string[];
}

export interface CodesimExamFormat {
  id: string;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
  sections: Array<{ label: string; count: number; notes?: string }>;
  mixNotes?: string;
}

export interface CodesimTopicCatalog {
  tags: Array<{ id: string; label: string; mcqCount: number }>;
  difficulties: Array<{ id: string; label: string; mcqCount: number }>;
  presets: CodesimTopicPreset[];
  suggested: string[];
  mcqCountOptions: number[];
  defaultMcqCount: number;
  aiGenEnabled: boolean;
  examFormat: CodesimExamFormat;
}

export interface CodesimAIExamPlan {
  summary: string;
  mcqCount: number;
  mcqFocus: string;
  buildFocus: string;
  debugFocus: string;
  suggestedDifficulty: string;
  tags: string[];
  warnings?: string[];
}

export interface CodesimAIPlanResponse {
  planId: string;
  plan: CodesimAIExamPlan;
  brief: string;
  aiGenEnabled: boolean;
  expiresAt: string;
}

export interface CodesimSessionSelection {
  topics?: string[];
  difficulty?: string;
  mcqCount?: number;
  presetId?: string;
}

export interface CodesimSessionSummary {
  id: string;
  status: "setup" | "in_progress" | "submitted" | "expired";
  source: "bank" | "ai" | string;
  label: string;
  questionCount: number;
  selection?: CodesimSessionSelection;
  grade?: string;
  normalizedScore?: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface CodesimSession {
  id: string;
  blueprintId?: string;
  seed: number;
  status: "setup" | "in_progress" | "submitted" | "expired";
  questions: CodesimExamQuestion[];
  selection?: CodesimSessionSelection;
  answers?: {
    mcq?: Record<string, string>;
    code?: Record<
      string,
      { sourceCode: string; testsPassed: boolean; testResults?: unknown }
    >;
  };
  startedAt?: string;
  expiresAt?: string;
  submittedAt?: string;
  totalTimeLimitMinutes: number;
}

export interface CodesimDebrief {
  resultLabel: string;
  explanation: string;
  answerFeedback?: string;
  bestPractices: string[];
  commonMistakes?: string[];
  learningObjective?: string;
  solutionCode?: string;
  userCode?: string;
  correctAnswer?: string;
}

export interface CodesimReportQuestionPrompt {
  title?: string;
  body?: string;
  codeSnippet?: string;
  choices?: Array<{ id: string; text: string }>;
}

export interface CodesimReportQuestion {
  index: number;
  type: string;
  correct: boolean;
  partial?: boolean;
  earnedPoints: number;
  maxPoints: number;
  userAnswer?: string;
  prompt?: CodesimReportQuestionPrompt;
  debrief: CodesimDebrief;
}

export interface CodesimReport {
  sessionId: string;
  earnedPoints: number;
  totalPoints: number;
  normalizedScore: number;
  grade: string;
  questions: CodesimReportQuestion[];
  learningSummary: {
    strengths?: string[];
    weaknesses?: string[];
    recommendedTopics?: string[];
  };
  proctorSummary: { blurEvents: number; pasteEvents: number };
}

async function claimSessionOnServer(sessionId: string) {
  const clientToken = getOrCreateClientToken();
  if (!clientToken) return;
  await api.post(`/codesim/sessions/${sessionId}/claim`, { clientToken });
}

function rememberSession(sessionId: string) {
  trackCodesimSession(sessionId);
  void claimSessionOnServer(sessionId).catch(() => undefined);
}

export const codesimApi = {
  async listTopics() {
    const res = await api.get<CodesimTopicCatalog>("/codesim/topics");
    return res.data;
  },

  async planAIExam(brief: string, mcqCount?: number) {
    const res = await api.post<CodesimAIPlanResponse>(
      "/codesim/ai/plan",
      { brief, mcqCount },
      { timeout: 120_000 },
    );
    return res.data;
  },

  async listBlueprints() {
    const res = await api.get<{ blueprints: CodesimBlueprint[] }>("/codesim/blueprints");
    return res.data.blueprints;
  },

  async listSessions(limit = 30) {
    const ids = getCodesimSessionIds();
    await Promise.all(ids.map((id) => claimSessionOnServer(id).catch(() => undefined)));
    const clientToken = getOrCreateClientToken();
    const res = await api.get<{ sessions: CodesimSessionSummary[] }>("/codesim/sessions", {
      params: {
        limit,
        ...(clientToken ? { clientToken } : {}),
        ...(ids.length > 0 ? { ids: ids.join(",") } : {}),
      },
    });
    return res.data.sessions;
  },

  async claimSession(id: string) {
    await claimSessionOnServer(id);
  },

  async createSession(params?: {
    blueprintSlug?: string;
    seed?: number;
    topics?: string[];
    difficulty?: string;
    mcqCount?: number;
    presetId?: string;
    aiPlanId?: string;
    reuseSessionId?: string;
  }) {
    const res = await api.post<{ session: CodesimSession }>(
      "/codesim/sessions",
      {
        blueprintSlug: params?.blueprintSlug,
        seed: params?.seed,
        topics: params?.topics,
        difficulty: params?.difficulty,
        mcqCount: params?.mcqCount,
        presetId: params?.presetId,
        aiPlanId: params?.aiPlanId,
        reuseSessionId: params?.reuseSessionId,
        clientToken: getOrCreateClientToken() || undefined,
      },
      params?.aiPlanId ? { timeout: 180_000 } : undefined,
    );
    const session = res.data.session;
    rememberSession(session.id);
    return session;
  },

  async regenerateSession(id: string) {
    const res = await api.post<{ session: CodesimSession }>(`/codesim/sessions/${id}/regenerate`);
    const session = res.data.session;
    rememberSession(session.id);
    return session;
  },

  async startSession(id: string) {
    const res = await api.post<{ session: CodesimSession }>(`/codesim/sessions/${id}/start`);
    const session = res.data.session;
    rememberSession(session.id);
    return session;
  },

  async getSession(id: string) {
    const res = await api.get<{ session: CodesimSession }>(`/codesim/sessions/${id}`);
    const session = res.data.session;
    rememberSession(session.id);
    return session;
  },

  async saveAnswers(id: string, answers: CodesimSession["answers"]) {
    const res = await api.put<{ session: CodesimSession }>(`/codesim/sessions/${id}/answers`, {
      answers,
    });
    return res.data.session;
  },

  async recordProctorEvents(
    id: string,
    events: Array<{ eventType: string; metadata?: Record<string, unknown> }>
  ) {
    await api.post(`/codesim/sessions/${id}/proctor-events`, { events });
  },

  async submitSession(id: string) {
    rememberSession(id);
    const res = await api.post<{ report: CodesimReport }>(`/codesim/sessions/${id}/submit`);
    return res.data.report;
  },

  async getReport(id: string) {
    const res = await api.get<{ report: CodesimReport }>(`/codesim/sessions/${id}/report`);
    return res.data.report;
  },

  async saveCustomBlueprint(title: string, config: CodesimBlueprint["config"]) {
    const res = await api.post<{ id: string }>("/codesim/custom-blueprint", { title, config });
    return res.data.id;
  },
};
