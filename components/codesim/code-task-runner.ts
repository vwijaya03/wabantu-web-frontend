import type { CodesimExamQuestion } from "@/lib/api/codesim";
import { runCodeAssertions } from "@/components/codesim/code-task-assertions";

export type CodeTaskTestResult = {
  passed: boolean;
  message: string;
};

export function runCodeTaskTests(
  source: string,
  question: CodesimExamQuestion,
  hasPreviewError: boolean
): CodeTaskTestResult {
  const code = source.trim();
  if (!code) {
    return { passed: false, message: "Kode masih kosong" };
  }
  if (!/\bexport\b/.test(code)) {
    return { passed: false, message: "Export komponen React diperlukan" };
  }
  if (hasPreviewError) {
    return {
      passed: false,
      message: "Preview error — perbaiki error di panel kanan sebelum submit test",
    };
  }

  if (question.type !== "react_build" && question.type !== "react_debug") {
    return { passed: false, message: "Tipe soal tidak dikenali" };
  }

  const result = runCodeAssertions(code, question);
  if (result.passed) {
    return {
      passed: true,
      message: "Semua kriteria fungsional terpenuhi",
    };
  }

  return {
    passed: false,
    message: result.failures[0] ?? "Kriteria belum terpenuhi",
  };
}
