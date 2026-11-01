import { test, expect } from "@playwright/test";

test("engine card sits right of the board and does not move the side column", async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 900 });
  await page.goto("/index.html");
  await page.locator("#uploadInput").setInputFiles({
    name: "g.pgn",
    mimeType: "text/plain",
    buffer: Buffer.from('[Event "x"]\n[Result "*"]\n\n1. e4 e5 *\n'),
  });
  await expect(page.locator("#varTree .var-line").first()).toBeVisible();

  const sideTopBefore = (await page.locator(".side-col").boundingBox()).y;
  const firstSideCardBefore = (await page.locator(".side-col > details").first().boundingBox()).y;

  await page.locator("#engineCheckbox").check();
  await expect(page.locator("#engineCard")).toBeVisible();

  const board = await page.locator("#board").boundingBox();
  const card = await page.locator("#engineCard").boundingBox();
  expect(card.x).toBeGreaterThanOrEqual(board.x + board.width); // right of the board
  expect(card.y).toBeLessThan(board.y + board.height); // beside it, not below

  expect((await page.locator(".side-col").boundingBox()).y).toBe(sideTopBefore);
  expect((await page.locator(".side-col > details").first().boundingBox()).y).toBe(firstSideCardBefore);
});
