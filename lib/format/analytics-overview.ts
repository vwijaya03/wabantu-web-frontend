/** Format rolling-window open rate for the overview card. */
export function formatOpenRateCard(
  pct: number | null | undefined,
  windowDays: number,
): { value: string; hint: string } {
  if (pct == null) {
    return { value: "—", hint: "Butuh data" };
  }
  return {
    value: `${pct}%`,
    hint: `Pesan keluar terbaca (${windowDays} hari)`,
  };
}

/** Format average first-response time from seconds. */
export function formatAvgFirstResponse(
  sec: number | null | undefined,
): { value: string; hint: string } {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) {
    return { value: "—", hint: "Butuh data" };
  }
  if (sec < 60) {
    return {
      value: `${Math.round(sec)} dtk`,
      hint: "Rata-rata ke balasan pertama",
    };
  }
  if (sec < 3600) {
    return {
      value: `${Math.round(sec / 60)} mnt`,
      hint: "Rata-rata ke balasan pertama",
    };
  }
  return {
    value: `${(sec / 3600).toFixed(1)} jam`,
    hint: "Rata-rata ke balasan pertama",
  };
}
