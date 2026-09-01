import { api } from "./client";

export type AIRegressionCaseResult = {
  name: string;
  passed: boolean;
  error?: string;
};

export type AIRegressionSuiteDetail = {
  name: string;
  passed: boolean;
  durationMs: number;
  cases: AIRegressionCaseResult[];
  skipped?: boolean;
  skipReason?: string;
};

export type AIRegressionBuyerflowResult = {
  passed: boolean;
  durationMs: number;
  suites: AIRegressionSuiteDetail[];
};

export type AIRegressionSuiteSummary = {
  name: string;
  passed: boolean;
  durationMs: number;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  caseCount?: number;
  failedCase?: string;
};

export type RunAIRegressionResponse = {
  passed: boolean;
  durationMs: number;
  suites: AIRegressionSuiteSummary[];
  buyerflow: AIRegressionBuyerflowResult;
};

export const aiRegressionApi = {
  async run(): Promise<RunAIRegressionResponse> {
    const res = await api.post("/admin/ai-regression/run");
    return res.data;
  },
};
