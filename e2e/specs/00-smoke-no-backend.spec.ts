import { test, expect } from "@playwright/test";
import { step } from "../env";
import { expectNoAppCrash } from "../helpers";

/** Tidak butuh backend: halaman login client & superadmin ter-render. */
test.describe("smoke tanpa backend", () => {
  test("halaman /login ter-render", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Masuk ke akun" })).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expectNoAppCrash(page);
    await step(page, "login-page");
  });

  test("/login tidak menautkan halaman superadmin", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('a[href*="platform-admin"]')).toHaveCount(0);
  });

  test("halaman /platform-admin/login ter-render", async ({ page }) => {
    await page.goto("/platform-admin/login");
    await expect(page.getByRole("heading", { name: "Login Platform Admin" })).toBeVisible();
    await expectNoAppCrash(page);
    await step(page, "platform-admin-login-page");
  });
});
