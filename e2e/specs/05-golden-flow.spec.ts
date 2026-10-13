import path from "node:path";
import { test, expect } from "@playwright/test";
import { E2E, requireBackend, requireEnv, step } from "../env";
import { clientLoginOk } from "../helpers";

test.describe("5) golden flow simulator", () => {
  test("reseller → harga tier → bukti transfer → owner setujui → selesai", async ({ page, request }) => {
    test.setTimeout(240_000);
    await requireBackend(request);
    requireEnv("clientEmail", "clientPassword", "orderMessage");
    await clientLoginOk(page, "/dashboard/simulator");
    await expect(page.getByRole("heading", { name: "Simulator Chat" })).toBeVisible();
    await expect(page.getByText("Session ID: reseller-demo")).toBeVisible();

    await page.getByPlaceholder(/Ketik pesan/).fill(E2E.orderMessage);
    await page.getByRole("button", { name: "Kirim" }).click();
    await expect(page.getByText("Menunggu balasan bot…")).toHaveCount(0, { timeout: 90_000 });
    // Soft: badge tingkat bergantung pada field `pricing` dari backend; gagal tetap dilaporkan tapi flow lanjut.
    if (E2E.expectedTier) await expect.soft(page.getByText(new RegExp(`Tingkat:\\s*(Harga\\s+)?${E2E.expectedTier}`, "i"))).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Belum ada pesanan di percakapan ini.")).toHaveCount(0, { timeout: 90_000 });
    // UI memformat harga sebagai "@ Rp 72.000" (id-ID), env berisi angka polos "72000".
    if (E2E.expectedUnitPrice) {
      const fmt = Number(E2E.expectedUnitPrice).toLocaleString("id-ID");
      await expect(page.getByText(new RegExp(`@\\s*(Rp\\s*)?(${fmt.replace(/\./g, "\\.")}|${E2E.expectedUnitPrice})`)).first()).toBeVisible();
    }
    // Bot meminta nama penerima + HP sebelum order bisa diproses; kirim data sintetis (1 pesan, hemat rate limit).
    if (await page.getByText(/Kirim nama penerima/).isVisible().catch(() => false)) {
      await page.getByPlaceholder(/Ketik pesan/).fill("Nama: Budi\nHP: 081234567890");
      await page.getByRole("button", { name: "Kirim" }).click();
      await expect(page.getByText("Menunggu balasan bot…")).toHaveCount(0, { timeout: 90_000 });
    }
    await step(page, "order-created-tier-price");

    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "../fixtures/bukti-transfer.png"));
    await expect(page.getByText("Menunggu balasan bot…")).toHaveCount(0, { timeout: 90_000 });
    await step(page, "proof-uploaded");

    const approve = page.getByRole("button", { name: "Setujui pesanan" });
    await expect(approve).toBeEnabled({ timeout: 60_000 });
    const ar = page.waitForResponse((r) => /\/orders\/[^/]+\/approve/.test(r.url()));
    await approve.click();
    // Dialog konfirmasi (jika ada).
    const confirm = page.getByRole("alertdialog").getByRole("button", { name: /Setujui|Ya/ });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    expect((await ar).status()).toBeLessThan(400);
    await expect(page.getByRole("button", { name: "Sudah disetujui" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/completed|selesai/i).first()).toBeVisible();
    await step(page, "order-approved-completed");
  });
});
