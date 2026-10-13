import { test, expect } from "@playwright/test";
import { E2E, api, requireBackend, requireEnv, step } from "../env";
import { adminLogin } from "../helpers";

test.describe("2) login superadmin", () => {
  test.beforeEach(async ({ request }) => {
    await requireBackend(request);
  });

  test("login + /platform-admin/me", async ({ page }) => {
    requireEnv("adminEmail", "adminPassword");
    const meResp = page.waitForResponse((r) => r.url().includes("/api/v1/platform-admin/me"), { timeout: 30_000 }).catch(() => null);
    const loginResp = page.waitForResponse((r) => r.url().includes("/api/v1/platform-admin/login"));
    await adminLogin(page);
    const lr = await loginResp;
    expect(lr.status()).toBe(200);
    const { accessToken } = (await lr.json()).data ?? (await lr.json());
    const me = await meResp;
    if (me) expect(me.status()).toBe(200);
    // Verifikasi langsung ke API dengan token admin.
    const r = await page.request.get(api("/platform-admin/me"), { headers: { Authorization: `Bearer ${accessToken}` } });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(JSON.stringify(body)).toContain(E2E.adminEmail);
    // Token admin tidak boleh tersimpan di storage.
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(stored).not.toContain(accessToken);
    await step(page, "admin-me");
  });

  test("password salah → generik; lockout → 429", async ({ page }) => {
    requireEnv("lockoutEmail");
    await page.goto("/platform-admin/login");
    let saw429 = false;
    for (let i = 0; i < E2E.lockoutAttempts && !saw429; i++) {
      await page.locator("#email").fill(E2E.lockoutEmail);
      await page.locator("#password").fill(`salah-${i}-xxxxxxxx`);
      const resp = page.waitForResponse((r) => r.url().includes("/api/v1/platform-admin/login"));
      await page.getByRole("button", { name: "Masuk" }).click();
      const st = (await resp).status();
      if (i === 0) {
        expect([401, 403]).toContain(st);
        await expect(page.getByRole("alert")).toHaveText("Email atau password salah.");
        await step(page, "admin-wrong-password");
      }
      saw429 = st === 429;
    }
    expect(saw429, `tidak ada 429 setelah ${E2E.lockoutAttempts} percobaan`).toBe(true);
    await expect(page.getByRole("alert")).toContainText("Terlalu banyak percobaan");
    await step(page, "admin-lockout-429");
  });
});
