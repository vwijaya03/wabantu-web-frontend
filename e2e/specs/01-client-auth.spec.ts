import { test, expect } from "@playwright/test";
import { E2E, requireBackend, requireEnv, step } from "../env";
import { clientLogin, clientLoginOk, firebaseAuthUserCount } from "../helpers";

test.describe("1) login & logout client", () => {
  test.beforeEach(async ({ request }) => {
    await requireBackend(request);
    requireEnv("clientEmail", "clientPassword");
  });

  test("password salah → pesan generik", async ({ page }) => {
    await clientLogin(page, E2E.clientEmail, `${E2E.clientPassword}__salah`);
    await expect(page.getByText("Email atau password salah")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await step(page, "wrong-password");
  });

  test("login berhasil lalu logout (firebaseSignOut)", async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (m) => logs.push(m.text()));
    await clientLoginOk(page, "/dashboard");

    await page.getByRole("button").filter({ has: page.locator("svg.lucide-chevron-down") }).last().click();
    await page.getByRole("menuitem", { name: "Keluar", exact: true }).click();
    await page.waitForURL(/\/login/);
    await step(page, "after-logout");

    // Firebase: tidak boleh ada user tersisa di IndexedDB (0 juga bila Firebase tidak dikonfigurasi).
    expect(await firebaseAuthUserCount(page)).toBe(0);
    // Sesi client benar-benar hilang: buka dashboard → kembali ke /login.
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    test.info().annotations.push({ type: "console", description: logs.filter((l) => /firebase/i.test(l)).join("\n") || "(tidak ada log firebase)" });
  });
});
