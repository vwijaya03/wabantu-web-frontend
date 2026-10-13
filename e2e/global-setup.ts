import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

function assertLocalhost(raw: string, label: string) {
  const u = new URL(raw.includes("://") ? raw : `http://${raw}`);
  if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
    throw new Error(`${label} bukan localhost (${u.hostname}); reset Redis dibatalkan`);
  }
}

/**
 * Reset counter login lokal. Hanya jika E2E_LOCAL_RESET=1 dan semua target localhost.
 * Tidak menyentuh Redis produksi.
 */
export default async function globalSetup() {
  if (process.env.E2E_LOCAL_RESET !== "1") return;
  assertLocalhost(process.env.E2E_BASE_URL ?? "http://localhost:3000", "E2E_BASE_URL");
  if (process.env.E2E_API_BASE_URL) assertLocalhost(process.env.E2E_API_BASE_URL, "E2E_API_BASE_URL");
  const redis = process.env.E2E_REDIS_URL ?? "redis://127.0.0.1:6379";
  assertLocalhost(redis, "E2E_REDIS_URL");

  const patterns = ["login:*:fail:*", "login:*:lock:*", "rl:auth:*"];
  for (const pattern of patterns) {
    const { stdout } = await exec("redis-cli", ["-u", redis, "--scan", "--pattern", pattern], { timeout: 15_000 });
    const keys = stdout.split("\n").map((s) => s.trim()).filter(Boolean);
    for (let i = 0; i < keys.length; i += 100) {
      const batch = keys.slice(i, i + 100);
      await exec("redis-cli", ["-u", redis, "DEL", ...batch], { timeout: 15_000 });
    }
  }
}
