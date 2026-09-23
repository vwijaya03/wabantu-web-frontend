"use client";

import { useSearchParams } from "next/navigation";

export function WebComponentPreviewClient() {
  const params = useSearchParams();
  const assetId = params.get("assetId") ?? "";
  const token = params.get("token") ?? "";

  return (
    <main className="min-h-screen bg-muted/30 p-4">
      <iframe
        title="Web Component Preview"
        sandbox="allow-scripts"
        className="h-[480px] w-full rounded-lg border bg-white"
        src={`/embed/preview/wc/shell?assetId=${encodeURIComponent(assetId)}&token=${encodeURIComponent(token)}`}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Preview berjalan di sandbox iframe tanpa same-origin — komponen tidak dapat mengakses cookie dashboard.
      </p>
    </main>
  );
}
