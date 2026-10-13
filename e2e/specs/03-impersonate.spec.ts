import { test, expect } from "@playwright/test";
import { E2E, api, requireBackend, requireEnv, step } from "../env";
import { adminLogin } from "../helpers";

test.describe("3) impersonate (Pantau)", () => {
  test("mulai, token impersonate ditolak di /admin/*, lalu stop", async ({ page, request }) => {
    await requireBackend(request);
    requireEnv("adminEmail", "adminPassword", "impersonateTenant");
    await adminLogin(page, "/dashboard/admin");

    const impResp = page.waitForResponse((r) => /\/api\/v1\/admin\/impersonate\//.test(r.url()) && r.request().method() === "POST");
    const row = page.getByRole("row").filter({ hasText: E2E.impersonateTenant }).first();
    await row.getByRole("button", { name: "Pantau" }).click();
    const r = await impResp;
    expect(r.status()).toBe(200);
    const j = await r.json();
    const impToken: string = (j.data ?? j).accessToken;
    expect(impToken).toBeTruthy();

    await expect(page.getByText("Mode internal — memantau tenant")).toBeVisible({ timeout: 30_000 });
    await step(page, "impersonating");

    // Token impersonation tidak boleh dipakai untuk /admin/* (backend: 403).
    for (const p of ["/admin/ai/catalog", "/admin/ai/function-config"]) {
      const res = await request.get(api(p), { headers: { Authorization: `Bearer ${impToken}` }, failOnStatusCode: false });
      expect([401, 403], `${p} → ${res.status()}`).toContain(res.status());
    }

    await page.getByRole("button", { name: "Keluar" }).filter({ has: page.locator("svg.lucide-x") }).click();
    await expect(page.getByText("Mode internal — memantau tenant")).toHaveCount(0, { timeout: 30_000 });
    await step(page, "impersonate-stopped");
  });
});
