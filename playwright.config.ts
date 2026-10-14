import { defineConfig, devices } from "@playwright/test";

/**
 * E2E WABantu web-frontend. Semua target & kredensial dari env (lihat e2e/README.md).
 * Lokal: E2E_BASE_URL=http://localhost:3000 (npm run dev) + E2E_API_BASE_URL=http://localhost:4000 (encore run).
 * Cloud Run: cukup ganti kedua env itu.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/specs",
  globalSetup: "./e2e/global-setup.ts",
  outputDir: "./e2e-artifacts/test-results",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e-artifacts/html-report", open: "never" }],
    ["json", { outputFile: "e2e-artifacts/results.json" }],
  ],
  use: {
    baseURL,
    trace: "on",
    screenshot: "on",
    video: "retain-on-failure",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
