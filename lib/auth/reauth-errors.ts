/** True when re-auth cannot recover (Redis session gone, invalid token, etc.). */
export function isReauthSessionGone(err: { status?: number; code?: string; message?: string }): boolean {
  if (err.status !== 401) return false;
  const msg = (err.message ?? "").toLowerCase();
  if (err.code === "unauthenticated" && !msg.includes("password")) return true;
  return (
    msg.includes("session berakhir") ||
    msg.includes("session tidak valid") ||
    msg.includes("session tidak ditemukan") ||
    msg.includes("silakan masuk ulang")
  );
}
