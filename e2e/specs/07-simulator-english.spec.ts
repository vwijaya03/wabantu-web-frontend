import { test, expect, type Page } from "@playwright/test";
import { requireBackend, requireEnv, step } from "../env";
import { clientLoginOk } from "../helpers";

const ID_REGRESSION_PATTERNS = [
  /Ringkasan Pesanan/i,
  /Siap kak/i,
  /ya kak/i,
  /varian yang ada/i,
];

/** Shop-path English (not CS handoff from profile_incomplete / quota). */
const EN_SHOP_REPLY =
  /variants we have|available .* variants|Here are the|How many|Which variant|added to your order|Order Summary|don't have|not sure|Sure —/i;

const PROFILE_INCOMPLETE_CS =
  /tim CS kami akan segera|Maaf kak, tim CS/i;

function assertShopReplyNotProfileIncomplete(reply: string, label: string) {
  expect(
    reply,
    `${label}: looks like profile_incomplete CS handoff — complete business_profile + catalog for E2E tenant before language asserts`,
  ).not.toMatch(PROFILE_INCOMPLETE_CS);
}

function assertNotIndonesianRegression(reply: string, label: string) {
  for (const pat of ID_REGRESSION_PATTERNS) {
    expect(reply, `${label}: regression — must not match ${pat}`).not.toMatch(pat);
  }
}

/** Last outbound bubble in Percakapan (bot replies align right). */
async function lastBotReplyText(page: Page): Promise<string> {
  const bubbles = page.locator("div.max-w-\\[85\\%\\].ml-auto.rounded-lg.border");
  await expect(bubbles.last()).toBeVisible({ timeout: 15_000 });
  return bubbles.last().innerText();
}

test.describe("7) simulator — English language path", () => {
  test("hi → English → Maggi shop stays English (not ID templates)", async ({ page, request }) => {
    test.setTimeout(360_000);
    await requireBackend(request);
    requireEnv("clientEmail", "clientPassword");
    await clientLoginOk(page, "/dashboard/simulator");
    await expect(page.getByRole("heading", { name: "Simulator Chat" })).toBeVisible();
    await expect(page.getByText("Session ID: reseller-demo")).toBeVisible();
    await expect(page.getByText(/simulator hanya untuk tenant demo|Tidak ada akses/i)).toHaveCount(0);

    const sendAndWait = async (text: string) => {
      const post = page.waitForResponse(
        (r) => r.url().includes("/api/v1/simulator/messages") && r.request().method() === "POST",
      );
      await page.getByPlaceholder(/Ketik pesan/).fill(text);
      await page.getByRole("button", { name: "Kirim" }).click();
      const sr = await post;
      expect(sr.status(), `simulator POST for ${text.slice(0, 40)}`).toBeLessThan(400);
      await expect(page.getByText("Menunggu balasan bot…")).toHaveCount(0, { timeout: 90_000 });
    };

    await sendAndWait("hi");
    await step(page, "after-hi-language-offer");

    await sendAndWait("English");
    const afterEnglish = await lastBotReplyText(page);
    expect(afterEnglish, "language menu should confirm English choice").toMatch(/English/i);
    await step(page, "after-english-choice");

    await sendAndWait("i wanna buy Maggi Seasonings");
    const maggiReply = await lastBotReplyText(page);
    assertShopReplyNotProfileIncomplete(maggiReply, "Maggi inquiry");
    test.info().annotations.push({
      type: "bot-reply-maggi",
      description: maggiReply.slice(0, 1200),
    });
    assertNotIndonesianRegression(maggiReply, "Maggi inquiry");
    expect(maggiReply, "Maggi reply should be English catalog/variant text after English is chosen").toMatch(
      EN_SHOP_REPLY,
    );
    await step(page, "after-maggi-inquiry");

    const followUp = /Maggi Kari|Maggi Tandoori|1\.|Which/i.test(maggiReply)
      ? "Maggi Kari 1 pcs"
      : "Maggi Kari seasoning 1 pcs";
    await sendAndWait(followUp);
    const orderReply = await lastBotReplyText(page);
    test.info().annotations.push({
      type: "bot-reply-order",
      description: orderReply.slice(0, 1200),
    });
    assertShopReplyNotProfileIncomplete(orderReply, "order follow-up");
    assertNotIndonesianRegression(orderReply, "order follow-up");
    await step(page, "after-order-follow-up");
  });
});
