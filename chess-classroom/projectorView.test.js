import test from "node:test";
import assert from "node:assert/strict";
import { overlayView, annotationsToDraw, isBlack } from "./projectorView.js";

const ALL_ON = { moveNumber: true, gameTitle: true, arrows: true };

test("overlayView shows a label only when its overlay is on and there is text", () => {
  const pointer = { moveLabel: "5.Nf3", gameTitle: "A vs B" };
  assert.deepEqual(overlayView(pointer, ALL_ON), {
    moveNumber: { hidden: false, text: "5.Nf3" },
    gameTitle: { hidden: false, text: "A vs B" },
  });
  const off = overlayView(pointer, { ...ALL_ON, moveNumber: false, gameTitle: false });
  assert.equal(off.moveNumber.hidden, true);
  assert.equal(off.gameTitle.hidden, true);
});

test("overlayView hides empty labels even when the overlay is on", () => {
  const view = overlayView({ moveLabel: null, gameTitle: null }, ALL_ON);
  assert.deepEqual(view, {
    moveNumber: { hidden: true, text: "" },
    gameTitle: { hidden: true, text: "" },
  });
});

test("annotationsToDraw draws nothing when the arrows overlay is off", () => {
  const pointer = { arrows: [{ color: "danger", from: "a1", to: "a2" }], markers: [{ color: "info", square: "c3" }] };
  assert.deepEqual(annotationsToDraw(pointer, { ...ALL_ON, arrows: false }, ["danger"], ["info"]), {
    arrows: [],
    markers: [],
  });
});

test("annotationsToDraw falls back to success for an unknown color", () => {
  const pointer = {
    arrows: [{ color: "engine1", from: "e2", to: "e4" }, { color: "mauve", from: "a1", to: "a2" }],
    markers: [{ color: "engine1", square: "c3" }],
  };
  const result = annotationsToDraw(pointer, ALL_ON, ["success", "engine1"], ["success", "info"]);
  assert.deepEqual(result.arrows.map((a) => a.color), ["engine1", "success"]);
  assert.equal(result.markers[0].color, "success"); // engine1 isn't a marker color
});

test("annotationsToDraw tolerates a pointer without arrays", () => {
  assert.deepEqual(annotationsToDraw({}, ALL_ON, [], []), { arrows: [], markers: [] });
});

test("isBlack", () => {
  assert.equal(isBlack("black"), true);
  assert.equal(isBlack("white"), false);
  assert.equal(isBlack(undefined), false);
});
