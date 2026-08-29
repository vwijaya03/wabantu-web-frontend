import type { CodesimExamQuestion } from "@/lib/api/codesim";

export type CodeAssertion = {
  check: string;
  field?: string;
  max?: number;
  min?: number;
  substring?: string;
  id?: string;
  prop?: string;
  name?: string;
};

export type AssertionRunResult = {
  passed: boolean;
  failures: string[];
};

function parseAssertions(question: CodesimExamQuestion): CodeAssertion[] {
  const raw =
    question.type === "react_build"
      ? question.build?.testCases
      : question.debug?.testCases;
  if (!raw) return inferAssertions(question);

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return inferAssertions(question);
    const structured = parsed.filter(
      (item): item is CodeAssertion =>
        item != null && typeof item === "object" && typeof item.check === "string"
    );
    if (structured.length > 0) return structured;
    return inferAssertions(question);
  } catch {
    return inferAssertions(question);
  }
}

function inferAssertions(question: CodesimExamQuestion): CodeAssertion[] {
  if (question.type === "react_debug") {
    const code = question.debug?.brokenCode ?? "";
    const title = question.debug?.title ?? "";
    if (title.includes("Missing Key") || /\.map\s*\([^)]*,\s*i\s*\)/.test(code)) {
      return [{ check: "no_index_list_key" }, { check: "stable_list_key" }];
    }
    if (title.includes("Infinite Render") || /setN\s*\(\s*n\s*\+/.test(code)) {
      return [{ check: "no_setstate_in_render" }, { check: "has_testid", id: "hero" }];
    }
    if (title.includes("Stale Props") || /useState\s*\(\s*subtitle\s*\)/.test(code)) {
      return [{ check: "renders_prop", prop: "subtitle" }, { check: "has_testid", id: "hero" }];
    }
    return [{ check: "has_testid", id: "hero" }];
  }

  const title = question.build?.title ?? "";
  const spec = question.build?.specMarkdown ?? "";
  const testId = title.replace(/([A-Z])/g, (m, c, i) => (i > 0 ? "-" : "") + c.toLowerCase());
  const fieldFromSpec =
    spec.match(/field `([^`]+)`/i)?.[1] ??
    spec.match(/controlled untuk `([^`]+)`/i)?.[1] ??
    "email";

  const checks: CodeAssertion[] = [
    { check: "has_testid", id: testId || "form" },
    { check: "controlled_input", field: fieldFromSpec },
    { check: "form_prevent_default" },
    { check: "calls_on_submit", field: fieldFromSpec },
    { check: "shows_error" },
  ];

  if (/max\s*200/i.test(spec)) {
    checks.push({ check: "validates_max_length", field: fieldFromSpec, max: 200 });
  }
  if (/mengandung @/i.test(spec)) {
    checks.push({ check: "validates_includes", field: fieldFromSpec, substring: "@" });
  }
  if (/minimal 6/i.test(spec)) {
    checks.push({ check: "validates_min_length", field: fieldFromSpec, min: 6 });
  }

  return checks;
}

export function runCodeAssertions(
  source: string,
  question: CodesimExamQuestion
): AssertionRunResult {
  const code = source.trim();
  const failures: string[] = [];
  const assertions = parseAssertions(question);

  for (const assertion of assertions) {
    const err = runOneAssertion(code, assertion);
    if (err) failures.push(err);
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

function runOneAssertion(code: string, a: CodeAssertion): string | null {
  switch (a.check) {
    case "has_testid": {
      const id = a.id ?? "hero";
      if (!new RegExp(`data-testid=['"]${escapeRegExp(id)}['"]`).test(code)) {
        return `Form/komponen harus punya data-testid="${id}"`;
      }
      return null;
    }
    case "controlled_input": {
      const field = a.field ?? "email";
      if (!new RegExp(`name=['"]${escapeRegExp(field)}['"]`).test(code)) {
        return `Input field "${field}" harus ada`;
      }
      if (!/value=\{[^}]+\}/.test(code) || !/onChange=/.test(code)) {
        return `Input "${field}" harus controlled (value + onChange)`;
      }
      return null;
    }
    case "form_prevent_default":
      if (!/onSubmit=/.test(code)) {
        return "Form harus punya handler onSubmit";
      }
      if (!/preventDefault\s*\(\s*\)/.test(code)) {
        return "Handler submit harus memanggil e.preventDefault()";
      }
      return null;
    case "calls_on_submit": {
      const field = a.field ?? "email";
      if (!/onSubmit\s*\?\.\s*\(/.test(code) && !/onSubmit\s*\(/.test(code)) {
        return "Panggil prop onSubmit saat data valid";
      }
      if (!new RegExp(`${escapeRegExp(field)}\\s*:`).test(code)) {
        return `onSubmit harus mengirim field "${field}"`;
      }
      return null;
    }
    case "shows_error":
      if (!/role=['"]alert['"]/.test(code) && !/setError|error\s*&&/.test(code)) {
        return "Tampilkan pesan error (mis. elemen dengan role=\"alert\")";
      }
      return null;
    case "validates_max_length": {
      const max = a.max ?? 200;
      if (!new RegExp(`${max}|length\\s*>`).test(code)) {
        return `Tambahkan validasi panjang maksimal ${max} karakter`;
      }
      return null;
    }
    case "validates_min_length": {
      const min = a.min ?? 1;
      if (!new RegExp(`length\\s*<\\s*${min}|\\.length\\s*<\\s*${min}`).test(code)) {
        return `Tambahkan validasi minimal ${min} karakter`;
      }
      return null;
    }
    case "validates_includes": {
      const sub = a.substring ?? "@";
      if (!new RegExp(`includes\\s*\\(\\s*['"]${escapeRegExp(sub)}['"]`).test(code)) {
        return `Validasi harus memeriksa karakter "${sub}"`;
      }
      return null;
    }
    case "validates_required":
      if (!/!value|trim\(\)|wajib|kosong/i.test(code)) {
        return "Tambahkan validasi field wajib diisi";
      }
      return null;
    case "no_index_list_key":
      if (/key=\{\s*i\s*\}/.test(code) || /key=\{\s*index\s*\}/.test(code)) {
        return "Jangan pakai index array sebagai key — gunakan id stabil dari item";
      }
      return null;
    case "stable_list_key":
      if (!/key=\{[^}]*\.id[^}]*\}/.test(code)) {
        return "Key list harus memakai properti stabil (mis. key={it.id})";
      }
      return null;
    case "no_setstate_in_render": {
      const body = code.replace(/^[\s\S]*?return\s*\(/, "");
      if (/set[A-Z]\w*\s*\(/.test(body.split("onClick")[0] ?? body)) {
        return "Jangan panggil setState di body render — pindahkan ke event handler";
      }
      return null;
    }
    case "renders_prop": {
      const prop = a.prop ?? "subtitle";
      if (new RegExp(`useState\\s*\\(\\s*${prop}\\s*\\)`).test(code) && !/useEffect/.test(code)) {
        return `Jangan copy prop ${prop} ke state tanpa sync — render prop langsung atau sync dengan useEffect`;
      }
      if (!new RegExp(`\\{${prop}\\}`).test(code)) {
        return `Tampilkan prop ${prop} di JSX`;
      }
      return null;
    }
    default:
      return null;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
