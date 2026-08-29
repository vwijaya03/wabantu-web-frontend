import type { CodesimExamQuestion } from "@/lib/api/codesim";

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

  if (question.type === "react_debug") {
    return runDebugTests(code, question);
  }
  if (question.type === "react_build") {
    return runBuildTests(code, question);
  }

  return { passed: false, message: "Tipe soal tidak dikenali" };
}

function runDebugTests(code: string, question: CodesimExamQuestion): CodeTaskTestResult {
  const title = question.debug?.title ?? "";

  if (title === "List Key Debug" || code.includes('data-testid="item-list"')) {
    if (/key=\{\s*index\s*\}/.test(code)) {
      return {
        passed: false,
        message: "Masih memakai index sebagai key — gunakan id stabil dari data (mis. item.id)",
      };
    }
    if (!/key=\{[^}]*\.id[^}]*\}/.test(code)) {
      return {
        passed: false,
        message: "Key harus memakai properti stabil dari item (mis. key={item.id})",
      };
    }
    return { passed: true, message: "Key list sudah stabil" };
  }

  if (title === "Hero Debug" || code.includes('data-testid="hero"')) {
    if (/setCount\s*\(\s*count\s*\+/.test(code) && !/onClick|useEffect/.test(code)) {
      return {
        passed: false,
        message: "setState masih dipanggil di body render — pindahkan ke event handler",
      };
    }
    return { passed: true, message: "Tidak ada setState di render" };
  }

  return { passed: true, message: "Preview berjalan tanpa error" };
}

function runBuildTests(code: string, question: CodesimExamQuestion): CodeTaskTestResult {
  const title = question.build?.title ?? "";

  if (title === "WaitlistForm" || code.includes("waitlist-form")) {
    if (!/value=\{[^}]+\}/.test(code) || !/onChange=/.test(code)) {
      return {
        passed: false,
        message: "Input email harus controlled (value + onChange)",
      };
    }
    if (!/includes\s*\(\s*["']@["']\s*\)/.test(code)) {
      return {
        passed: false,
        message: "Tambahkan validasi email mengandung @",
      };
    }
    if (!/preventDefault\s*\(\s*\)/.test(code)) {
      return {
        passed: false,
        message: "handleSubmit harus memanggil preventDefault()",
      };
    }
    return { passed: true, message: "Form waitlist memenuhi kriteria" };
  }

  if (title === "ProductCard" || code.includes("product-card")) {
    if (!/\{name\}/.test(code) || !/\{price\}/.test(code)) {
      return {
        passed: false,
        message: "Tampilkan props name dan price",
      };
    }
    if (!/onClick|onAdd/.test(code)) {
      return {
        passed: false,
        message: "Tombol Tambah harus memanggil onAdd",
      };
    }
    return { passed: true, message: "ProductCard memenuhi kriteria" };
  }

  return { passed: true, message: "Preview berjalan tanpa error" };
}
