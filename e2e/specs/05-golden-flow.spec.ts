import crypto from "node:crypto";
import zlib from "node:zlib";
import { test, expect, type Page } from "@playwright/test";
import { E2E, requireBackend, requireEnv, step } from "../env";
import { clientLoginOk } from "../helpers";

/** PNG 32x32 dengan piksel acak → hash bukti transfer unik per run (BE menolak hash bukti duplikat dengan 409). */
function uniqueProofPng(): Buffer {
  const w = 32, h = 32;
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) crypto.randomFillSync(raw, y * (w * 3 + 1) + 1, w * 3);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

test.describe("5) golden flow simulator", () => {
  test("reseller → harga tier → bukti transfer → owner setujui → selesai", async ({ page, request }) => {
    test.setTimeout(240_000);
    await requireBackend(request);
    requireEnv("clientEmail", "clientPassword", "orderMessage");
    await clientLoginOk(page, "/dashboard/simulator");
    await expect(page.getByRole("heading", { name: "Simulator Chat" })).toBeVisible();
    await expect(page.getByText("Session ID: reseller-demo")).toBeVisible();
    const previousOrder = await visibleOrderNumber(page);

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

    const created = page.getByText(/WB-\d+/).first();
    await expect(created).toBeVisible({ timeout: 90_000 });
    await expect.poll(async () => (await created.innerText()).trim(), { timeout: 90_000 }).not.toBe(previousOrder);
    const newOrderNumber = (await created.innerText()).trim();

    await page.locator('input[type="file"]').setInputFiles({ name: `bukti-transfer-${Date.now()}.png`, mimeType: "image/png", buffer: uniqueProofPng() });
    await expect(page.getByText("Menunggu balasan bot…")).toHaveCount(0, { timeout: 90_000 });
    await expect.poll(async () => (await page.getByText(/WB-\d+/).first().innerText()).trim()).toBe(newOrderNumber);
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

async function visibleOrderNumber(page: Page): Promise<string> {
  const loc = page.getByText(/WB-\d+/).first();
  if ((await loc.count()) === 0) return "";
  return (await loc.innerText()).trim();
}
