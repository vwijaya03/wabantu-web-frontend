import { Suspense } from "react";
import { WebComponentPreviewClient } from "./preview-client";

export default function WebComponentPreviewPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Memuat…</div>}>
      <WebComponentPreviewClient />
    </Suspense>
  );
}
