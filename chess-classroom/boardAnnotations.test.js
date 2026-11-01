import test from "node:test";
import assert from "node:assert/strict";
import { colorKeyFromClassName, annotationsFromBoard, annotationsForBoard } from "./boardAnnotations.js";

const ARROW = { success: { class: "arrow-success" }, danger: { class: "arrow-danger" } };
const MARKER = { info: { class: "marker-circle-info" }, warning: { class: "marker-circle-warning" } };

test("colorKeyFromClassName maps cm-chessboard class names to color keys", () => {
  assert.equal(colorKeyFromClassName("arrow-danger"), "danger");
  assert.equal(colorKeyFromClassName("marker-circle-info"), "info");
  assert.equal(colorKeyFromClassName("arrow-warning"), "warning");
  assert.equal(colorKeyFromClassName("arrow-success"), "success");
  assert.equal(colorKeyFromClassName("something-unknown"), "success");
});

test("annotationsFromBoard converts arrows/markers and drops excluded (engine) arrow types", () => {
  const engineType = { class: "arrow-engine-1" };
  const result = annotationsFromBoard(
    {
      arrows: [
        { type: ARROW.danger, from: "e2", to: "e4" },
        { type: engineType, from: "d2", to: "d4" },
      ],
      markers: [{ type: MARKER.info, square: "c3" }],
    },
    [engineType]
  );
  assert.deepEqual(result, {
    arrows: [{ color: "danger", from: "e2", to: "e4" }],
    markers: [{ color: "info", square: "c3" }],
  });
});

test("annotationsFromBoard works with no exclusions", () => {
  const result = annotationsFromBoard({ arrows: [{ type: ARROW.success, from: "a1", to: "a2" }], markers: [] });
  assert.equal(result.arrows.length, 1);
});

test("annotationsForBoard resolves color keys to the exact type objects", () => {
  const result = annotationsForBoard(
    { arrows: [{ color: "danger", from: "e2", to: "e4" }], markers: [{ color: "warning", square: "c3" }] },
    ARROW,
    MARKER
  );
  assert.equal(result.arrows[0].type, ARROW.danger); // same reference, not a look-alike
  assert.equal(result.markers[0].type, MARKER.warning);
  assert.deepEqual([result.arrows[0].from, result.arrows[0].to, result.markers[0].square], ["e2", "e4", "c3"]);
});

test("annotationsForBoard tolerates missing arrays", () => {
  assert.deepEqual(annotationsForBoard({}, ARROW, MARKER), { arrows: [], markers: [] });
});

test("board -> plain -> board round-trips", () => {
  const plain = { arrows: [{ color: "danger", from: "a1", to: "h8" }], markers: [{ color: "info", square: "d4" }] };
  const onBoard = annotationsForBoard(plain, ARROW, MARKER);
  assert.deepEqual(annotationsFromBoard(onBoard), plain);
});
