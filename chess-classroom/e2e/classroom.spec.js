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
