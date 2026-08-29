"use client";

import { useEffect, useRef } from "react";
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react";

type Props = {
  starterCode: string;
  onChange: (code: string) => void;
  onRunTests?: () => void;
  testsPassed?: boolean;
};

const defaultFiles = (code: string) => ({
  "/App.js": code,
  "/index.js": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(<App />);`,
  "/public/index.html": `<!DOCTYPE html><html><body><div id="root"></div></body></html>`,
});

function EditorPane({ onChange }: { onChange: (code: string) => void }) {
  const { sandpack } = useSandpack();
  const lastRef = useRef("");

  useEffect(() => {
    const code = sandpack.files["/App.js"]?.code ?? "";
    if (code !== lastRef.current) {
      lastRef.current = code;
      onChange(code);
    }
  }, [sandpack.files, onChange]);

  return (
    <SandpackLayout>
      <SandpackCodeEditor showTabs={false} />
      <SandpackPreview showNavigator={false} />
    </SandpackLayout>
  );
}

export function CodeTaskEditor({ starterCode, onChange, onRunTests, testsPassed }: Props) {
  return (
    <div data-codesim-editor className="space-y-2">
      <SandpackProvider
        key={starterCode.slice(0, 80)}
        template="react"
        files={defaultFiles(starterCode)}
        options={{ visibleFiles: ["/App.js"] }}
      >
        <EditorPane onChange={onChange} />
      </SandpackProvider>
      <div className="flex items-center gap-3">
        {onRunTests && (
          <button
            type="button"
            onClick={onRunTests}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
          >
            Jalankan test
          </button>
        )}
        {testsPassed !== undefined && (
          <span className={testsPassed ? "text-emerald-700" : "text-slate-500"}>
            {testsPassed ? "✓ Test lulus" : "Test belum dijalankan / gagal"}
          </span>
        )}
      </div>
    </div>
  );
}

/** Simple client-side check: solution must export a function component. */
export function runSimpleCodeCheck(source: string): boolean {
  const trimmed = source.trim();
  return trimmed.includes("export") && (trimmed.includes("function") || trimmed.includes("=>"));
}
