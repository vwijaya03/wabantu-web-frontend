import { api } from "./client";

export interface ImportPreview {
  jobId: string;
  targetTable?: string;
  headers: string[];
  sampleRows: string[][];
  suggestions: Record<string, string>;
  totalRows: number;
}

export type ImportTargetTable = "business_catalog_item";

export interface ImportResult {
  jobId: string;
  status: string;
  imported: number;
  failed: number;
  errors?: string[];
}

export const importApi = {
  async preview(file: File, targetTable: ImportTargetTable = "business_catalog_item"): Promise<ImportPreview> {
    const form = new FormData();
    form.append("file", file);
    form.append("targetTable", targetTable);
    const res = await api.post("/import/preview", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  async execute(input: {
    jobId: string;
    targetTable?: ImportTargetTable;
    columnMapping: Record<string, string>;
  }): Promise<{ jobId: string }> {
    const res = await api.post("/import/execute", input);
    return res.data;
  },
  async status(jobId: string): Promise<ImportResult> {
    const res = await api.get(`/import/status/${jobId}`);
    return res.data;
  },
};
