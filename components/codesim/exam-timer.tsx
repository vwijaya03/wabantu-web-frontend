"use client";

import { useEffect, useRef, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  expiresAt?: string | null;
  onExpire?: () => void;
};

export function ExamTimer({ expiresAt, onExpire }: Props) {
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!expiresMs) return;
    expiredRef.current = false;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (!expiredRef.current && current >= expiresMs) {
        expiredRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresMs, onExpire]);

  if (expiresMs === null) return null;

  const remaining = expiresMs - now;
  const urgent = remaining < 5 * 60 * 1000;

  return (
    <span
      className={`font-mono text-sm font-medium ${urgent ? "text-red-600" : "text-slate-700"}`}
    >
      ⏱ {formatRemaining(remaining)}
    </span>
  );
}
