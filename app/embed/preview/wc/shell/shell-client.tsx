"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function WebComponentShellClient() {
  const params = useSearchParams();
  const hostRef = useRef<HTMLDivElement>(null);
  const assetId = params.get("assetId") ?? "";
  const token = params.get("token") ?? "";

  useEffect(() => {
    if (!assetId || !token || !hostRef.current) return;
    const api = process.env.NEXT_PUBLIC_API_URL ?? "";
    const script = document.createElement("script");
    script.type = "module";
    script.src = `${api}/api/v1/public/template-assets/${assetId}/module.js?token=${encodeURIComponent(token)}`;
    script.onerror = () => {
      if (hostRef.current) hostRef.current.textContent = "Gagal memuat modul (token kedaluwarsa atau asset ditolak).";
    };
    hostRef.current.appendChild(script);
    return () => {
      script.remove();
    };
  }, [assetId, token]);

  return <div ref={hostRef} className="p-4 text-sm" />;
}
