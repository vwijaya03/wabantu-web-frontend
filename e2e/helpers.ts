import { expect, type Page } from "@playwright/test";
import { E2E, step } from "./env";

export async function clientLogin(page: Page, email = E2E.clientEmail, password = E2E.clientPassword, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}

export async function clientLoginOk(page: Page, next = "/dashboard") {
  await clientLogin(page, undefined, undefined, next);
  await page.waitForURL((u) => u.pathname.startsWith(next), { timeout: 30_000 });
  await step(page, "client-login-ok");
}

/** Sesi admin hanya di memori: setelah ini navigasi harus client-side (tanpa page.goto/reload). */
export async function adminLogin(page: Page, next = "/dashboard/admin/ai-providers") {
  await page.goto(`/platform-admin/login?next=${encodeURIComponent(next)}`);
  await page.locator("#email").fill(E2E.adminEmail);
  await page.locator("#password").fill(E2E.adminPassword);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL((u) => u.pathname.startsWith(next), { timeout: 30_000 });
  await step(page, "admin-login-ok");
}

/** Klik link sidebar/dropdown (client-side) agar sesi memori tidak hilang. */
export async function clientNav(page: Page, href: string) {
  await page.evaluate((h) => {
    const a = document.createElement("a");
    a.href = h;
    document.body.appendChild(a);
    a.click();
  }, href);
}

export async function expectNoAppCrash(page: Page) {
  await expect(page.getByText(/Application error|Unhandled Runtime Error|This page could not be found/i)).toHaveCount(0);
}

export async function firebaseAuthUserCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    if (!dbs.some((d) => d.name === "firebaseLocalStorageDb")) return 0;
    return new Promise<number>((resolve) => {
      const req = indexedDB.open("firebaseLocalStorageDb");
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("firebaseLocalStorage")) return resolve(0);
        const c = db.transaction("firebaseLocalStorage", "readonly").objectStore("firebaseLocalStorage").count();
        c.onsuccess = () => resolve(c.result);
        c.onerror = () => resolve(-1);
      };
      req.onerror = () => resolve(-1);
    });
  });
}
