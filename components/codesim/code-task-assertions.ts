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
    if (title.includes("Effect Loop")) {
      return [
        { check: "has_testid", id: "hero" },
        { check: "use_effect_has_dependency_array" },
        { check: "no_broken_onclick_setstate" },
      ];
    }
    if (title.includes("Click Handler")) {
      return [
        { check: "has_testid", id: "hero" },
        { check: "onclick_handler_reference" },
      ];
    }
    if (title.includes("Conditional Hook")) {
      return [
        { check: "has_testid", id: "hero" },
        { check: "no_hooks_in_conditional" },
      ];
    }
    if (title.includes("Missing Return")) {
      return [
        { check: "has_testid", id: "hero" },
        { check: "has_explicit_return" },
        { check: "renders_prop", prop: "title" },
      ];
    }
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
    spec.match(/for field `([^`]+)`/i)?.[1] ??
    "email";

  const checks: CodeAssertion[] = [
    { check: "has_testid", id: testId || "form" },
    { check: "controlled_input", field: fieldFromSpec },
    { check: "form_prevent_default" },
    { check: "calls_on_submit", field: fieldFromSpec },
    { check: "shows_error" },
  ];

  const maxMatch = spec.match(/max\s*(\d+)/i);
  if (maxMatch) {
    checks.push({
      check: "validates_max_length",
      field: fieldFromSpec,
      max: Number(maxMatch[1]),
    });
  }
  if (/must contain @|mengandung @/i.test(spec)) {
    checks.push({ check: "validates_includes", field: fieldFromSpec, substring: "@" });
  }
  const minMatch = spec.match(/min(?:imum)?\s*(\d+)/i);
  if (minMatch) {
    checks.push({
      check: "validates_min_length",
      field: fieldFromSpec,
      min: Number(minMatch[1]),
    });
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

function hasMinLengthValidation(code: string, min: number): boolean {
  const lessThan = new RegExp(`(?:\\.length|trim\\(\\)\\.length)\\s*<\\s*${min}`);
  const lessOrEqual = new RegExp(`(?:\\.length|trim\\(\\)\\.length)\\s*<=\\s*${min - 1}`);
  return lessThan.test(code) || lessOrEqual.test(code);
}

function hasWrongExactLengthValidation(code: string, min: number): boolean {
  return new RegExp(`\\.length\\s*===?\\s*${min}\\b`).test(code);
}

function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function activeSource(code: string): string {
  return stripComments(code);
}

function runOneAssertion(code: string, a: CodeAssertion): string | null {
  const active = activeSource(code);
  switch (a.check) {
    case "has_testid": {
      const id = a.id ?? "hero";
      if (!new RegExp(`data-testid=['"]${escapeRegExp(id)}['"]`).test(code)) {
        return `Form/component must have data-testid="${id}"`;
      }
      return null;
    }
    case "controlled_input": {
      const field = a.field ?? "email";
      if (!new RegExp(`name=['"]${escapeRegExp(field)}['"]`).test(code)) {
        return `Input field "${field}" is required`;
      }
      if (!/value=\{[^}]+\}/.test(code) || !/onChange=/.test(code)) {
        return `Input "${field}" must be controlled (value + onChange)`;
      }
      return null;
    }
    case "form_prevent_default":
      if (!/onSubmit=/.test(code)) {
        return "Form must have an onSubmit handler";
      }
      if (!/preventDefault\s*\(\s*\)/.test(code)) {
        return "Submit handler must call e.preventDefault()";
      }
      return null;
    case "calls_on_submit": {
      const field = a.field ?? "email";
      if (!/onSubmit\s*\?\.\s*\(/.test(code) && !/onSubmit\s*\(/.test(code)) {
        return "Call the onSubmit prop when data is valid";
      }
      if (!new RegExp(`${escapeRegExp(field)}\\s*:`).test(code)) {
        return `onSubmit must send field "${field}"`;
      }
      return null;
    }
    case "shows_error":
      if (!/role=['"]alert['"]/.test(code) && !/setError|error\s*&&/.test(code)) {
        return 'Show an error message (e.g. element with role="alert")';
      }
      return null;
    case "validates_max_length": {
      const max = a.max ?? 200;
      if (!new RegExp(`${max}|length\\s*>`).test(code)) {
        return `Add validation for maximum length of ${max} characters`;
      }
      return null;
    }
    case "validates_min_length": {
      const min = a.min ?? 1;
      if (hasWrongExactLengthValidation(code, min) && !hasMinLengthValidation(code, min)) {
        return `Use a minimum-length check (e.g. value.length < ${min}), not exact equality (== ${min})`;
      }
      if (!hasMinLengthValidation(code, min)) {
        return `Add validation for minimum ${min} characters (e.g. value.length < ${min})`;
      }
      return null;
    }
    case "validates_includes": {
      const sub = a.substring ?? "@";
      if (!new RegExp(`includes\\s*\\(\\s*['"]${escapeRegExp(sub)}['"]`).test(code)) {
        return `Validation must check for "${sub}"`;
      }
      return null;
    }
    case "validates_required":
      if (!/!value|trim\(\)|required|empty/i.test(code)) {
        return "Add required-field validation";
      }
      return null;
    case "no_index_list_key":
      if (/key=\{\s*i\s*\}/.test(code) || /key=\{\s*index\s*\}/.test(code)) {
        return "Do not use array index as key — use a stable id from the item";
      }
      return null;
    case "stable_list_key":
      if (!/key=\{[^}]*\.id[^}]*\}/.test(code)) {
        return "List keys must use a stable property (e.g. key={it.id})";
      }
      return null;
    case "no_setstate_in_render": {
      const body = active.replace(/^[\s\S]*?return\s*\(/, "");
      if (/set[A-Z]\w*\s*\(/.test(body.split("onClick")[0] ?? body)) {
        return "Do not call setState in the render body — move it to an event handler";
      }
      return null;
    }
    case "use_effect_has_dependency_array":
      if (!/useEffect/.test(active)) {
        return "Fix requires useEffect with a dependency array (e.g. useEffect(() => { ... }, []))";
      }
      if (!/useEffect\s*\([\s\S]*?,\s*\[[^\]]*\]\s*\)/.test(active)) {
        return "useEffect must include a dependency array — add [] or the correct deps (uncommented)";
      }
      return null;
    case "no_broken_onclick_setstate":
      if (/onClick=\{[^}]*setCount\s*\(\s*[a-zA-Z]\w*\s*\+/.test(active)) {
        return "onClick receives the click event — use setCount((n) => n + 1), not setCount(c + 1)";
      }
      return null;
    case "onclick_handler_reference":
      if (/onClick=\{[^}]*\(\s*\)/.test(active)) {
        return "Pass a function reference to onClick (e.g. onClick={bump}), not onClick={bump()}";
      }
      return null;
    case "no_hooks_in_conditional":
      if (/if\s*\([^)]+\)\s*\{[\s\S]*?use(?:State|Effect|Ref|Memo|Callback)\s*\(/.test(active)) {
        return "Hooks cannot be called inside if/loop — move them to the top level";
      }
      return null;
    case "has_explicit_return":
      if (!/\breturn\s+</.test(code) && !/\breturn\s*\(/.test(code)) {
        return "Component must return JSX (add return before the JSX)";
      }
      return null;
    case "renders_prop": {
      const prop = a.prop ?? "subtitle";
      if (new RegExp(`useState\\s*\\(\\s*${prop}\\s*\\)`).test(active) && !/useEffect/.test(active)) {
        return `Do not copy prop ${prop} to state without syncing — render the prop directly or sync with useEffect`;
      }
      if (!new RegExp(`\\{${prop}\\}`).test(code)) {
        return `Render prop ${prop} in JSX`;
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
