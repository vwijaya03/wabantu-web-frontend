import { test, expect } from "@playwright/test";
import { requireBackend, requireEnv, step } from "../env";
import { clientLoginOk, expectNoAppCrash } from "../helpers";

const PAGES: [string, RegExp][] = [
  ["/dashboard", /.+/],
  ["/dashboard/inbox", /^Inbox$/],
  ["/dashboard/catalog", /^Katalog Produk$/],
  ["/dashboard/orders", /.+/],
];

test.describe("6) halaman lama master tetap jalan", () => {
  test("dashboard, inbox, katalog, pesanan", async ({ page, request }) => {
    await requireBackend(request);
    requireEnv("clientEmail", "clientPassword");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await clientLoginOk(page, "/dashboard");
    for (const [p, heading] of PAGES) {
      const res = await page.goto(p);
      expect(res?.status() ?? 0, p).toBeLessThan(500);
      await expect(page).toHaveURL(new RegExp(p.replace(/\//g, "\\/")));
      await expect(page.getByRole("heading", { level: 1, name: heading }).first()).toBeVisible({ timeout: 30_000 });
      await expectNoAppCrash(page);
      await step(page, `legacy${p.replace(/\//g, "-")}`);
    }
    expect(errors, "uncaught page errors").toEqual([]);
  });
});
