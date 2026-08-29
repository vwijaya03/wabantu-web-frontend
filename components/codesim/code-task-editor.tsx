"use client";

import { useEffect, useRef } from "react";
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react";
import type { CodesimExamQuestion } from "@/lib/api/codesim";
import { runCodeTaskTests } from "@/components/codesim/code-task-runner";

type Props = {
  starterCode: string;
  question: CodesimExamQuestion;
  onChange: (code: string) => void;
  onTestResult: (passed: boolean, message: string, code: string) => void;
  testsPassed?: boolean;
  testMessage?: string;
};

const PREVIEW_BOOTSTRAP = `import React from "react";
import { createRoot } from "react-dom/client";
import * as UserModule from "./App";

function resolveComponent(mod) {
  if (typeof mod.default === "function") return mod.default;
  for (const key of Object.keys(mod)) {
    if (/^[A-Z]/.test(key) && typeof mod[key] === "function") return mod[key];
  }
  return function MissingExport() {
    return (
      <p style={{ padding: 16, fontFamily: "sans-serif" }}>
        Export komponen React: export function NamaKomponen() {"{ ... }"}
      </p>
    );
  };
}

const Component = resolveComponent(UserModule);

const mockProps = {
  items: [
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
  ],
  title: "Preview",
  name: "Produk Contoh",
  price: 99000,
  onJoin: () => {},
  onAdd: () => {},
};

function PreviewRoot() {
  return <Component {...mockProps} />;
}

createRoot(document.getElementById("root")).render(<PreviewRoot />);
`;

function defaultFiles(code: string) {
  return {
    "/App.js": code,
    "/index.js": PREVIEW_BOOTSTRAP,
    "/public/index.html": `<!DOCTYPE html><html><body><div id="root"></div></body></html>`,
  };
}

function EditorPane({
  onChange,
  question,
  onTestResult,
  testsPassed,
  testMessage,
}: {
  onChange: (code: string) => void;
  question: CodesimExamQuestion;
  onTestResult: (passed: boolean, message: string, code: string) => void;
  testsPassed?: boolean;
  testMessage?: string;
}) {
  const { sandpack } = useSandpack();
  const lastRef = useRef("");

  useEffect(() => {
    const code = sandpack.files["/App.js"]?.code ?? "";
    if (code !== lastRef.current) {
      lastRef.current = code;
      onChange(code);
    }
  }, [sandpack.files, onChange]);

  function handleRunTests() {
    const code = sandpack.files["/App.js"]?.code ?? "";
    const hasPreviewError = Boolean(sandpack.error);
    const result = runCodeTaskTests(code, question, hasPreviewError);
    onTestResult(result.passed, result.message, code);
  }

  return (
    <>
      <SandpackLayout>
        <SandpackCodeEditor showTabs={false} />
        <SandpackPreview showNavigator={false} />
      </SandpackLayout>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRunTests}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
        >
          Jalankan test
        </button>
        {testsPassed !== undefined && (
          <span className={testsPassed ? "text-emerald-700" : "text-red-600"}>
            {testsPassed ? `✓ ${testMessage ?? "Test lulus"}` : `✗ ${testMessage ?? "Test gagal"}`}
          </span>
        )}
        {sandpack.error && (
          <span className="text-xs text-red-600">Preview error — perbaiki dulu sebelum test lulus</span>
        )}
      </div>
    </>
  );
}

export function CodeTaskEditor({
  starterCode,
  question,
  onChange,
  onTestResult,
  testsPassed,
  testMessage,
}: Props) {
  return (
    <div data-codesim-editor className="space-y-2">
      <SandpackProvider
        key={starterCode.slice(0, 80)}
        template="react"
        files={defaultFiles(starterCode)}
        options={{ visibleFiles: ["/App.js"], activeFile: "/App.js" }}
      >
        <EditorPane
          onChange={onChange}
          question={question}
          onTestResult={onTestResult}
          testsPassed={testsPassed}
          testMessage={testMessage}
        />
      </SandpackProvider>
    </div>
  );
}
