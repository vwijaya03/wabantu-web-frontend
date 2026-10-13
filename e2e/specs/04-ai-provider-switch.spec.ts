import { test, expect } from "@playwright/test";
import { E2E, requireBackend, requireEnv, step } from "../env";
import { adminLogin, clientNav } from "../helpers";

const LABELS: Record<string, string> = { gemini: "Gemini", anthropic: "Anthropic", openai: "OpenAI" };

test.describe("4) ganti provider AI dari UI superadmin", () => {
  test("simpan provider chat → tersimpan; simulator tetap membalas", async ({ page, request }) => {
    await requireBackend(request);
    requireEnv("adminEmail", "adminPassword");
    await adminLogin(page, "/dashboard/admin/ai-providers");
    await expect(page.getByRole("heading", { name: "AI Providers" })).toBeVisible();

    // Kartu fungsi pertama (urutan AI_FUNCTIONS); badge berisi id fungsi, mis. "chat".
    const card = page.locator("div").filter({ has: page.getByRole("button", { name: "Simpan" }) }).filter({ hasText: /\bchat\b/ }).last();
    await card.getByRole("combobox").first().click();
    await page.getByRole("option", { name: new RegExp(`^${LABELS[E2E.targetProvider] ?? E2E.targetProvider}`) }).click();
    const put = page.waitForResponse((r) => /\/admin\/ai\/function-config\//.test(r.url()) && r.request().method() === "PUT");
    await card.getByRole("button", { name: "Simpan" }).click();
    const pr = await put;
    expect(pr.status()).toBe(200);
    expect(JSON.stringify(await pr.json())).toContain(E2E.targetProvider);
    await expect(page.getByText(/disimpan/)).toBeVisible();
    await step(page, "provider-saved");

    // Simulator: kirim pesan → ada balasan bot. (UI simulator tidak menampilkan nama provider;
    // provider yang dipakai diverifikasi QA via log/ai-activity/DB.)
    await clientNav(page, "/dashboard/simulator");
    await expect(page.getByRole("heading", { name: "Simulator Chat" })).toBeVisible({ timeout: 30_000 });
    const send = page.waitForResponse((r) => r.url().includes("/api/v1/simulator/messages") && r.request().method() === "POST");
    await page.getByPlaceholder(/Ketik pesan/).fill("halo, ada produk apa saja?");
    await page.getByRole("button", { name: "Kirim" }).click();
    const sr = await send;
    expect(sr.status()).toBeLessThan(400);
    test.info().annotations.push({ type: "simulator-response", description: (await sr.text()).slice(0, 2000) });
    await expect(page.getByText("Menunggu balasan bot…")).toHaveCount(0, { timeout: 60_000 });
    await step(page, "simulator-after-switch");
  });
});
