import { test, expect } from "@playwright/test";

const ANNOTATED_PGN = `[Event "Smoke"]
[White "Teacher"]
[Black "Student"]
[Result "*"]

1. e4! e5?? {#[The reply] Black should not do this.} 2. Nf3 {[#] Develop.} Nc6 *
`;

async function openWithGame(page, pgn = ANNOTATED_PGN) {
  await page.goto("/index.html");
  await page.locator("#langSelect").selectOption("en");
  await page.locator("#uploadInput").setInputFiles({
    name: "smoke.pgn",
    mimeType: "text/plain",
    buffer: Buffer.from(pgn),
  });
  await expect(page.locator("#varTree .var-line").first()).toBeVisible();
}

// Centre of a board square, assuming White at the bottom.
async function squareCentre(page, square) {
  const box = await page.locator("#board").boundingBox();
  const file = "abcdefgh".indexOf(square[0]);
  const rank = Number(square[1]) - 1;
  return {
    x: box.x + ((file + 0.5) * box.width) / 8,
    y: box.y + ((7 - rank + 0.5) * box.height) / 8,
  };
}

async function dragPiece(page, from, to) {
  const a = await squareCentre(page, from);
  const b = await squareCentre(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

test("uploaded PGN shows annotation glyphs in the variations panel", async ({ page }) => {
  await openWithGame(page);
  await expect(page.locator("#varTree")).toContainText("e4!");
  await expect(page.locator("#varTree")).toContainText("e5??");
});

test("Key positions lists every diagram marker and jumps to it", async ({ page }) => {
  await openWithGame(page);
  const buttons = page.locator("#diagramList .diagram-btn");
  await expect(buttons).toHaveCount(2);
  await expect(buttons.first()).toHaveText("The reply · Position after 1...e5??");
  await expect(buttons.nth(1)).toHaveText("Position after 2.Nf3");

  await buttons.nth(1).click();
  await expect(page.locator("#currentMove")).toHaveText("2.Nf3");
  await expect(page.locator("#notesBody")).toHaveText("Develop.");
  await expect(page.locator("#notesBody")).not.toContainText("#");
});

test("Key positions card is hidden when the game has no markers", async ({ page }) => {
  await openWithGame(page, "[Event \"x\"]\n[Result \"*\"]\n\n1. e4 e5 *\n");
  await expect(page.locator("#diagramCard")).toBeHidden();
});

test("switching language retitles the Key positions card", async ({ page }) => {
  await openWithGame(page);
  await expect(page.locator("#diagramCard summary")).toHaveText("Key positions");
  await page.locator("#langSelect").selectOption("fr");
  await expect(page.locator("#diagramCard summary")).toHaveText("Positions clés");
  await expect(page.locator("#diagramList .diagram-btn").nth(1)).toHaveText("Position après 2.Nf3");
});

test("projector tab follows the teacher tab while Sync is on", async ({ page, context }) => {
  await openWithGame(page);
  const projector = await context.newPage();
  await projector.goto("/projector.html");

  await page.locator("#varTree .var-line", { hasText: "Nf3" }).click();
  await expect(projector.locator("#ovMoveNumber")).toContainText("2.Nf3");

  await page.locator("#varTree .var-line", { hasText: "e4" }).click();
  await expect(projector.locator("#ovMoveNumber")).toContainText("1.e4");
});

test("Lock PGN rejects a deviating move; unlocked adds it as a sideline", async ({ page }) => {
  await openWithGame(page);
  await page.locator("#varTree .var-line", { hasText: "e4" }).first().click();
  const before = await page.locator("#varTree .var-line").count();

  // 1...d5 deviates from the loaded 1...e5
  await dragPiece(page, "d7", "d5");
  await expect(page.locator("#currentMove")).toHaveText("1.e4!");
  await expect(page.locator("#varTree .var-line")).toHaveCount(before);

  await page.locator("#lockPgnCheckbox").uncheck();
  await dragPiece(page, "d7", "d5");
  await expect(page.locator("#currentMove")).toHaveText("1...d5");
  await expect(page.locator("#varTree .var-line")).toHaveCount(before + 1);

  // the grown tree is persisted: wait for the async IndexedDB write, then reload
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise((resolve) => {
            const open = indexedDB.open("chess-classroom");
            open.onsuccess = () => {
              const all = open.result.transaction("pgnLibrary").objectStore("pgnLibrary").getAll();
              all.onsuccess = () => resolve(all.result.map((entry) => entry.pgnText).join("\n"));
            };
          })
      )
    )
    .toContain("d5");
  await page.reload();
  await expect(page.locator("#varTree")).toContainText("d5");
});

test("the buttons under the board step through the moves and disable at the ends", async ({ page }) => {
  await openWithGame(page);
  const [first, prev, next, last] = ["#navFirst", "#navPrev", "#navNext", "#navLast"].map((s) => page.locator(s));
  await expect(first).toBeDisabled();
  await expect(prev).toBeDisabled();
  await expect(next).toBeEnabled();

  await next.click();
  await expect(page.locator("#currentMove")).toHaveText("1.e4!");
  await last.click();
  await expect(page.locator("#currentMove")).toHaveText("2...Nc6");
  await expect(next).toBeDisabled();
  await expect(last).toBeDisabled();

  await prev.click();
  await expect(page.locator("#currentMove")).toHaveText("2.Nf3");
  await first.click();
  await expect(page.locator("#currentMove")).toHaveText(""); // start position: empty badge
  await expect(prev).toBeDisabled();
});

test("variations: black gets its ellipsis after a sideline, and a nested sideline flows inline in parentheses", async ({ page }) => {
  await openWithGame(
    page,
    '[Event "x"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 (2. Bc4 Nf6 (2... Bc5 3. Nf3) 3. d3) 2... Nc6 3. Bb5 *\n'
  );
  const tree = page.locator("#varTree");
  await expect(tree).toContainText("2...Nc6"); // ellipsis after the sideline
  const nested = tree.locator(".var-inline");
  await expect(nested).toHaveCount(1);
  await expect(nested).toHaveText(/^\(2\.\.\.Bc5\s*3\.Nf3\)$/);
  // inline: the nested line sits on the same row as its parent sideline's first move
  const parentRow = (await tree.locator(".var-sideline .var-line").first().boundingBox()).y;
  const nestedRow = (await nested.boundingBox()).y;
  expect(Math.abs(nestedRow - parentRow)).toBeLessThan(8);
});

const DEEP_PGN =
  '[Event "x"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 (2. Bc4 Nf6 3. d3 d6 4. c3 (4. Nc3 Be7 5. Nf3 O-O 6. O-O) 4... Be7) 2... Nc6 *\n';

test("Show more expands a folded sideline in place, without extra block or parentheses", async ({ page }) => {
  await openWithGame(page, DEEP_PGN);
  const sideline = page.locator("#varTree .var-sideline");
  await expect(sideline).toHaveCount(1);
  await expect(sideline.locator(".var-expand")).toHaveCount(1);

  await sideline.locator(".var-expand").first().click();
  await expect(page.locator("#varTree .var-sideline")).toHaveCount(1); // no second indented block
  await expect(sideline).toContainText("3.d3");
});

test("Show more inside a nested sideline keeps a single pair of parentheses", async ({ page }) => {
  await openWithGame(page, DEEP_PGN);
  // expand the top-level sideline fully, then the nested one
  for (let i = 0; i < 3; i++) {
    const more = page.locator("#varTree .var-expand");
    if ((await more.count()) === 0) break;
    await more.first().click();
  }
  const nested = page.locator("#varTree .var-inline");
  await expect(nested).toHaveCount(1);
  const text = await nested.innerText();
  expect(text.match(/\(/g)).toHaveLength(1);
  expect(text.match(/\)/g)).toHaveLength(1);
  await expect(nested).toContainText("6.O-O");
});

test("Home and End keys step to the start and end without scrolling the page", async ({ page }) => {
  await openWithGame(page);
  await page.setViewportSize({ width: 1200, height: 300 }); // short window: the page can scroll
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(300);
  await page.keyboard.press("End");
  await expect(page.locator("#currentMove")).toHaveText("2...Nc6");
  await page.waitForTimeout(300); // let a (wrongly) default-scrolling End take effect
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.keyboard.press("Home");
  await expect(page.locator("#currentMove")).toHaveText("");
});

test("engine card is hidden until the engine is switched on, and again after switching it off", async ({ page }) => {
  await openWithGame(page);
  await expect(page.locator("#engineCard")).toBeHidden();
  await page.locator("#engineCheckbox").check();
  await expect(page.locator("#engineCard")).toBeVisible();
  await page.locator("#engineCheckbox").uncheck();
  await expect(page.locator("#engineCard")).toBeHidden();
});

test("in a narrower window the engine card wraps below the board instead of overlapping it", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await openWithGame(page);
  await page.locator("#engineCheckbox").check();
  const board = await page.locator("#board").boundingBox();
  const card = await page.locator("#engineCard").boundingBox();
  const rightOfBoard = card.x >= board.x + board.width - 1;
  const belowBoard = card.y >= board.y + board.height - 1;
  expect(rightOfBoard || belowBoard).toBe(true);
});
